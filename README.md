# CourtManager – Gestión de canchas deportivas

MVP de aplicación móvil (React Native / Expo) para reservas de dos canchas: autenticación, reservar (fecha, cancha, duración, hora, nombre del cliente), validación en tiempo real de conflictos, y vista "Mis Reservas" con filtros y eliminación. Backend: Firebase (Auth + Firestore).

## Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Activa **Authentication** → método **Email/Password**.
3. Crea una base de datos **Firestore** (modo producción o prueba).
4. Copia `.env.example` a `.env` y rellena las variables `EXPO_PUBLIC_FIREBASE_*` con la configuración de tu proyecto.
5. Índice compuesto en Firestore (si Firebase te pide crearlo al usar la app):
   - Colección: `reservations`
   - Campos: `userId` (Ascendente), `date` (Ascendente)

## Get started

1. Instala dependencias

   ```bash
   npm install
   ```

2. Configura `.env` con tus claves de Firebase (ver arriba).

3. Inicia la app

   ```bash
   npx expo start
   ```

4. Para Android: `npx expo start --android`
