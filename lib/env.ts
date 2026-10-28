import Constants from 'expo-constants';

/** Variante de la app definida en app.config.js ("production", "development" o "preview"). */
export const APP_VARIANT = (Constants.expoConfig?.extra?.appVariant as string | undefined) ?? 'production';

export const IS_PRODUCTION = APP_VARIANT === 'production';
