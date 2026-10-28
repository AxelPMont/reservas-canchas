# SD Canchas

App móvil para gestionar la agenda de reservas de canchas deportivas. Hecha con React Native (Expo) y Firebase.

- Agenda por día con las canchas lado a lado y bloqueo de reservas dobles.
- Lista de reservas con búsqueda y filtros.
- Adelanto opcional, teléfono del cliente (con importación desde los contactos) y accesos a WhatsApp y llamada.
- Roles: **admin** (crea, edita y elimina) y **empleado** (crea y edita).
- Las reservas que ya terminaron no se pueden editar.

## Tecnologías

Expo SDK 54 · React Native 0.81 · expo-router · TypeScript · Firebase Auth + Firestore

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- [Android Studio](https://developer.android.com/studio) con un SDK de Android y la variable `ANDROID_HOME` configurada
- JDK 17 (sirve el que trae Android Studio, configurado en `JAVA_HOME`)
- Un celular Android con depuración USB activada, o un emulador

> La app usa módulos nativos (contactos, selector de fecha), así que no funciona en Expo Go: se compila una app de desarrollo.

## 1. Clonar e instalar

```bash
git clone https://github.com/AxelPMont/reservas-canchas.git
cd reservas-canchas
npm install
```

En Windows, clona el proyecto en una ruta corta (por ejemplo `C:\dev\reservas-canchas`): las rutas largas hacen fallar la compilación de Android.

## 2. Crear un proyecto de Firebase

1. En [Firebase Console](https://console.firebase.google.com) crea un proyecto.
2. **Authentication** → activa el proveedor **Correo electrónico/contraseña** y crea al menos un usuario.
3. **Firestore Database** → crea la base de datos.
4. **Configuración del proyecto** → **Tus apps** → registra una app **Web** y copia sus valores.

## 3. Variables de entorno

Copia la plantilla y completa los valores de tu app web de Firebase:

```bash
cp .env.example .env.development
```

## 4. Dar rol a los usuarios

Las reglas de Firestore solo permiten el acceso a usuarios con rol. En Firestore crea la colección `users` con un documento por usuario, cuyo ID sea el **UID** del usuario (lo ves en Authentication):

| Campo | Valor |
|---|---|
| `role` | `"admin"` o `"empleado"` |
| `displayName` | Nombre que se muestra en la app |

## 5. Publicar las reglas de Firestore

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore --project TU_PROJECT_ID
```

## 6. Ejecutar

Con el celular conectado por USB (o el emulador abierto):

```bash
npx expo run:android
```

Compila e instala la app **SD Canchas DEV**. Las siguientes veces basta con levantar el servidor y abrir la app:

```bash
npx expo start --dev-client
```

Si el celular no encuentra el servidor, conéctalo por USB y usa:

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

## Compilar un APK con EAS (opcional)

`app.json` apunta al proyecto de Expo del autor. Para compilar con tu propia cuenta de [Expo](https://expo.dev), vincula el proyecto a ella (reemplaza `owner` y `projectId`) y configura las variables `EXPO_PUBLIC_FIREBASE_*` en expo.dev:

```bash
npx eas-cli login
npx eas-cli init
npm run build:preview
```

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run lint` | Revisa el código con ESLint |
| `npx expo prebuild --platform android` | Regenera la carpeta `android/` después de cambiar `app.json` |

## Estructura

```
app/          Pantallas (expo-router): login, pestañas y reservas
components/   Componentes de interfaz
lib/          Firebase, acceso a datos, fechas y utilidades
contexts/     Sesión del usuario
constants/    Colores, fuentes y tema
types/        Tipos y configuración del horario
firestore.rules   Reglas de seguridad de Firestore
```

## Datos en Firestore

| Colección | Qué guarda |
|---|---|
| `reservations` | Las reservas (fecha, cancha, hora, duración, cliente, teléfono, adelanto, historial) |
| `schedules` | Un documento por cancha y día con los horarios ocupados; evita reservas dobles |
| `clients` | Clientes frecuentes para autocompletar |
| `users` | Rol y nombre de cada usuario |
