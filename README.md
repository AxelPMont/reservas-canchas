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

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
