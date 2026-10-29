import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, GithubAuthProvider, GoogleAuthProvider, OAuthProvider, getAuth, getIdToken, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseWebConfig } from './firebase-config';

export type ExternalAuthProvider = 'google' | 'github' | 'microsoft';
export interface FirebaseIdentityToken { provider: ExternalAuthProvider; idToken: string; }

/** Obtains an identity token for a future exchange into a SportManager internal JWT. */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  get enabled(): boolean { return firebaseWebConfig() !== null; }

  async obtainIdentityToken(provider: ExternalAuthProvider): Promise<FirebaseIdentityToken> {
    const result = await signInWithPopup(this.auth(), this.provider(provider));
    return { provider, idToken: await getIdToken(result.user) };
  }

  async signOut(): Promise<void> {
    if (getApps().length) await signOut(getAuth(getApp()));
  }

  errorMessage(error: unknown): string {
    const code = (error as { code?: string } | null)?.code;
    const messages: Record<string, string> = {
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
      'auth/cancelled-popup-request': 'Ya hay otra solicitud de acceso con Google en curso.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para SportManager.',
      'auth/unauthorized-domain': 'Autoriza el dominio de SportManager en Firebase Console → Authentication → Settings → Authorized domains.',
      'auth/operation-not-allowed': 'Habilita Google en Firebase Console → Authentication → Sign-in method.',
      'auth/auth-domain-config-required': 'Falta authDomain en la configuración web de Firebase.',
      'auth/invalid-api-key': 'La API key de Firebase no es válida. Revisa la configuración web del proyecto.',
      'auth/invalid-app-credential': 'Firebase rechazó la configuración de la aplicación. Revisa el proyecto y las restricciones de la API key.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa la red y los bloqueadores del navegador.',
      'auth/web-storage-unsupported': 'El navegador no permite el almacenamiento necesario para Firebase. Revisa sus restricciones de privacidad.'
    };
    return code
      ? `${messages[code] ?? 'No se pudo completar el acceso con Google.'} (${code})`
      : 'No se pudo iniciar Firebase para acceder con Google. Revisa la configuración web.';
  }

  private auth(): Auth {
    const config = firebaseWebConfig();
    if (!config) throw new Error('Firebase authentication is not configured');
    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
    return getAuth(app);
  }

  private provider(provider: ExternalAuthProvider): GoogleAuthProvider | GithubAuthProvider | OAuthProvider {
    switch (provider) {
      case 'google': return new GoogleAuthProvider();
      case 'github': return new GithubAuthProvider();
      case 'microsoft': return new OAuthProvider('microsoft.com');
    }
  }
}
