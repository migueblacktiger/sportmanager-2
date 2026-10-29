export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

declare global {
  interface Window {
    __SPORTMANAGER_FIREBASE_CONFIG__?: Partial<FirebaseWebConfig>;
  }
}

export function firebaseWebConfig(): FirebaseWebConfig | null {
  const config = globalThis.window?.__SPORTMANAGER_FIREBASE_CONFIG__;
  if (!config?.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;
  return { apiKey: config.apiKey, authDomain: config.authDomain,
    projectId: config.projectId, appId: config.appId };
}
