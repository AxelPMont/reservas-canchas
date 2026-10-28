#!/usr/bin/env node
/**
 * Copia las reservas del Firebase REAL al Firebase de PRUEBAS para probar la app nueva con datos reales.
 *
 * - Producción: SOLO LECTURA. Se inicia sesión con un usuario de la app real (correo y contraseña se
 *   piden en la terminal y no se guardan).
 * - Pruebas: se escribe con la clave de servicio del proyecto de pruebas (.secrets/dev-service-account.json).
 *   El script se detiene si esa clave o el destino no son el proyecto de pruebas.
 *
 * Uso:
 *   npm run data:check   → solo revisa las reservas reales y muestra un reporte (no copia nada)
 *   npm run data:copy    → revisa y copia (pide confirmación)
 *   npm run data:copy -- --clean → antes de copiar borra las reservas de PRUEBA existentes
 */
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, getFirestore, terminate } from 'firebase/firestore';
import { cert, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = '.secrets/dev-service-account.json';
const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const CLEAN = args.has('--clean');

// ---------- utilidades ----------

function readEnvFile(path) {
  if (!existsSync(path)) throw new Error(`No existe ${path}`);
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function firebaseConfig(env) {
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // No muestra lo que se escribe (contraseña).
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

/** Convierte Timestamps del SDK web al formato del SDK de administración (recursivo). */
function toAdmin(value) {
  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') return AdminTimestamp.fromMillis(value.toMillis());
    if (Array.isArray(value)) return value.map(toAdmin);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toAdmin(v)]));
  }
  return value;
}

// ---------- revisión de compatibilidad ----------

const EXPECTED = new Set(['date', 'courtId', 'startTime', 'durationMinutes', 'clientName', 'userId', 'createdAt']);
const NEW_FIELDS = new Set(['phone', 'deposit', 'history', 'createdByName', 'endsAt']);

function checkReservation(id, d, issues) {
  const add = (type, detail) => {
    if (!issues.has(type)) issues.set(type, []);
    issues.get(type).push(`${id}: ${detail}`);
  };
  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) add('Fecha con formato raro', JSON.stringify(d.date));
  if (!['1', '2'].includes(d.courtId)) add('Cancha desconocida', JSON.stringify(d.courtId));
  if (typeof d.startTime !== 'string' || !/^\d{2}:\d{2}$/.test(d.startTime)) {
    add('Hora con formato raro', JSON.stringify(d.startTime));
  } else {
    const [h, m] = d.startTime.split(':').map(Number);
    const start = h * 60 + m;
    if (start < 7 * 60) add('Empieza antes de las 7:00 AM', d.startTime);
    if (start >= 24 * 60) add('Empieza a medianoche (24:00) o después', `${d.date} ${d.startTime}`);
    if (typeof d.durationMinutes === 'number' && start + d.durationMinutes > 24 * 60) {
      add('Termina después de las 12:00 AM', `${d.date} ${d.startTime} + ${d.durationMinutes} min`);
    }
    if (m % 30 !== 0) add('Hora que no es :00 ni :30', d.startTime);
  }
  if (typeof d.durationMinutes !== 'number' || !Number.isInteger(d.durationMinutes)) {
    add('Duración que no es número entero', JSON.stringify(d.durationMinutes));
  } else if (d.durationMinutes < 30 || d.durationMinutes > 480) {
    add('Duración fuera de rango (30–480 min)', String(d.durationMinutes));
  }
  if (typeof d.clientName !== 'string' || d.clientName.trim().length === 0) add('Sin nombre de cliente', JSON.stringify(d.clientName));
  else if (d.clientName.length > 200) add('Nombre de cliente de más de 200 letras', `${d.clientName.length} letras`);
  for (const key of Object.keys(d)) {
    if (!EXPECTED.has(key) && !NEW_FIELDS.has(key)) add('Campo desconocido', key);
  }
  for (const key of EXPECTED) {
    if (!(key in d) && key !== 'createdAt') add(`Falta el campo "${key}"`, '');
  }
}

/** Reservas que se cruzan entre sí (mismo día y cancha) en los datos reales. */
function findOverlaps(docs) {
  const groups = new Map();
  for (const { id, data: d } of docs) {
    if (typeof d.startTime !== 'string') continue;
    const [h, m] = d.startTime.split(':').map(Number);
    const key = `${d.date}_${d.courtId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id, name: d.clientName, start: h * 60 + m, end: h * 60 + m + d.durationMinutes, time: d.startTime });
  }
  const out = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length && list[j].start < list[i].end; j++) {
        out.push(`${key.replace('_', ' cancha ')}: ${list[i].time} ${list[i].name} ↔ ${list[j].time} ${list[j].name}`);
      }
    }
  }
  return out;
}

// ---------- programa ----------

async function main() {
  const prodEnv = readEnvFile('.env.production');
  const devEnv = readEnvFile('.env.development');
  const prodProject = prodEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const devProject = devEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!prodProject || !devProject) throw new Error('Faltan los PROJECT_ID en .env.production o .env.development.');
  if (prodProject === devProject) throw new Error('Producción y pruebas apuntan al MISMO proyecto. Me detengo.');

  console.log(`\nProducción (solo lectura): ${prodProject}`);
  console.log(`Pruebas (destino):         ${devProject}\n`);

  // 1. Leer producción
  const email = await ask('Correo de la app REAL: ');
  const password = await ask('Contraseña: ', { hidden: true });
  const prodApp = initializeApp(firebaseConfig(prodEnv), 'prod');
  const prodAuth = getAuth(prodApp);
  await signInWithEmailAndPassword(prodAuth, email, password);
  const prodDb = getFirestore(prodApp);
  const snap = await getDocs(collection(prodDb, 'reservations'));
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  await signOut(prodAuth);
  await terminate(prodDb);
  console.log(`\n✔ Leídas ${docs.length} reservas de producción.`);

  // 2. Revisar
  const issues = new Map();
  docs.forEach(({ id, data }) => checkReservation(id, data, issues));
  const overlaps = findOverlaps(docs);
  const dates = docs.map((d) => d.data.date).filter((x) => typeof x === 'string').sort();
  console.log(`  Fechas: de ${dates[0]} a ${dates[dates.length - 1]}`);
  console.log(`  Cancha 1: ${docs.filter((d) => d.data.courtId === '1').length} · Cancha 2: ${docs.filter((d) => d.data.courtId === '2').length}`);

  console.log('\n=== Revisión de compatibilidad ===');
  if (issues.size === 0) console.log('✔ Todas las reservas tienen el formato que espera la app nueva.');
  for (const [type, list] of issues) {
    console.log(`\n• ${type}: ${list.length}`);
    list.slice(0, 5).forEach((l) => console.log(`    ${l}`));
    if (list.length > 5) console.log(`    … y ${list.length - 5} más`);
  }
  console.log(`\n• Reservas que se cruzan entre sí (reservas dobles ya existentes): ${overlaps.length}`);
  overlaps.slice(0, 10).forEach((l) => console.log(`    ${l}`));
  if (overlaps.length > 10) console.log(`    … y ${overlaps.length - 10} más`);

  if (CHECK_ONLY) {
    console.log('\nModo revisión: no se copió nada.');
    return;
  }

  // 3. Copiar a pruebas
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Falta ${SERVICE_ACCOUNT_PATH} (clave de servicio de ${devProject}). Mira el README.`);
  }
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  if (serviceAccount.project_id !== devProject) {
    throw new Error(`La clave de servicio es de "${serviceAccount.project_id}", no de "${devProject}". Me detengo.`);
  }
  if (serviceAccount.project_id === prodProject) throw new Error('La clave de servicio es de PRODUCCIÓN. Me detengo.');

  const confirm = await ask(
    `\n¿Copiar ${docs.length} reservas a ${devProject}${CLEAN ? ' (borrando antes los datos de prueba)' : ''}? Escribe "si": `
  );
  if (confirm.toLowerCase() !== 'si' && confirm.toLowerCase() !== 'sí') {
    console.log('Cancelado.');
    return;
  }

  const adminApp = initializeAdminApp({ credential: cert(serviceAccount), projectId: devProject }, 'dev-admin');
  const devDb = getAdminFirestore(adminApp);

  if (CLEAN) {
    for (const name of ['reservations', 'schedules', 'clients']) {
      const existing = await devDb.collection(name).listDocuments();
      for (let i = 0; i < existing.length; i += 400) {
        const batch = devDb.batch();
        existing.slice(i, i + 400).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      console.log(`  Borrados ${existing.length} documentos de ${name} (pruebas).`);
    }
  }

  for (let i = 0; i < docs.length; i += 400) {
    const batch = devDb.batch();
    docs.slice(i, i + 400).forEach(({ id, data }) => batch.set(devDb.collection('reservations').doc(id), toAdmin(data)));
    await batch.commit();
    process.stdout.write(`\r  Copiadas ${Math.min(i + 400, docs.length)} / ${docs.length}`);
  }
  console.log(`\n✔ Listo. Las reservas reales están en ${devProject} con los mismos IDs.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    const msg = e?.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : e?.message ?? String(e);
    console.error(`\n✖ ${msg}`);
    process.exit(1);
  });
