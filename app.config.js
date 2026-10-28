/**
 * Configuración dinámica sobre app.json.
 *
 * APP_VARIANT decide qué app se genera:
 * - "production" (o sin definir): la app real, idéntica a la que ya usan los empleados.
 * - "development" / "preview": app de pruebas "SD Canchas DEV", con otro paquete Android,
 *   así se puede instalar junto a la real sin reemplazarla.
 */
const APP_VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_PRODUCTION = APP_VARIANT === 'production';

module.exports = ({ config }) => ({
  ...config,
  name: IS_PRODUCTION ? config.name : `${config.name} DEV`,
  scheme: IS_PRODUCTION ? config.scheme : `${config.scheme}-dev`,
  android: {
    ...config.android,
    package: IS_PRODUCTION ? config.android.package : `${config.android.package}.dev`,
  },
  extra: {
    ...config.extra,
    appVariant: APP_VARIANT,
  },
});
