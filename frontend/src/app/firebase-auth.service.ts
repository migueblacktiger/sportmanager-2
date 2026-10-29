import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, User, GithubAuthProvider, GoogleAuthProvider, OAuthProvider, getAuth, getIdToken, inMemoryPersistence, reload, sendEmailVerification, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseWebConfig } from './firebase-config';

export type ExternalAuthProvider = 'google' | 'github' | 'microsoft';
export interface FirebaseIdentityToken { provider: ExternalAuthProvider; idToken: string; }
export type FirebaseOAuthResult = (FirebaseIdentityToken & { status: 'ready' })
  | { status: 'verification-required'; provider: ExternalAuthProvider; email: string };

/** Obtains an identity token for a future exchange into a SportManager internal JWT. */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private pendingIdentity?: { user: User; provider: ExternalAuthProvider };
  private verificationSending = false;
  private readonly verificationAttempts = new Map<string, number>();
  get enabled(): boolean { return firebaseWebConfig() !== null; }

  async obtainIdentityToken(provider: ExternalAuthProvider): Promise<FirebaseOAuthResult> {
    this.pendingIdentity = undefined;
    const auth = this.auth();
    // Firebase credentials are temporary; only SportManager's JWT is persisted by the app.
    await setPersistence(auth, inMemoryPersistence);
    const result = await signInWithPopup(auth, this.provider(provider));
    if (!result.user.email?.trim()) {
      await signOut(auth);
      throw { code: 'auth/missing-email' };
    }
    if (!result.user.emailVerified) {
      this.pendingIdentity = { user: result.user, provider };
      return { status: 'verification-required', provider, email: result.user.email };
    }
    return { status: 'ready', provider, idToken: await getIdToken(result.user) };
  }

  async sendPendingVerification(): Promise<void> {
    const { user } = this.requirePendingIdentity();
    if (this.verificationSending) throw { code: 'auth/verification-in-progress' };
    const remaining = 60_000 - (Date.now() - (this.verificationAttempts.get(user.uid) ?? 0));
    if (remaining > 0) throw { code: 'auth/verification-cooldown' };
    this.verificationSending = true;
    // Apply the cooldown on failed attempts too; Firebase also enforces server-side quotas.
    this.verificationAttempts.set(user.uid, Date.now());
    try {
      await sendEmailVerification(user);
    } finally {
      this.verificationSending = false;
    }
  }

  async confirmPendingVerification(): Promise<FirebaseIdentityToken> {
    const pending = this.requirePendingIdentity();
    await reload(pending.user);
    const idToken = await getIdToken(pending.user, true);
    // Do not exchange an unverified identity, even if the button is clicked early.
    this.requirePendingIdentity();
    if (!pending.user.email?.trim()) throw { code: 'auth/missing-email' };
    if (!pending.user.emailVerified) throw { code: 'auth/email-not-verified' };
    return { provider: pending.provider, idToken };
  }

  private requirePendingIdentity(): { user: User; provider: ExternalAuthProvider } {
    const pending = this.pendingIdentity;
    if (!pending || this.auth().currentUser?.uid !== pending.user.uid) {
      throw { code: 'auth/verification-state-lost' };
    }
    return pending;
  }

  async signOut(): Promise<void> {
    this.pendingIdentity = undefined;
    if (getApps().length) await signOut(getAuth(getApp()));
  }

  errorMessage(error: unknown, provider: ExternalAuthProvider = 'google', verification = false): string {
    const code = (error as { code?: string } | null)?.code;
    const messages: Record<string, string> = {
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
      'auth/cancelled-popup-request': 'Ya hay otra solicitud de acceso con Google en curso.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para SportManager.',
      'auth/unauthorized-domain': 'Autoriza el dominio de SportManager en Firebase Console → Authentication → Settings → Authorized domains.',
      'auth/operation-not-allowed': verification
        ? 'Firebase no permite enviar la verificación para esta cuenta o configuración. No se puede completar el acceso sin verificar el correo.'
        : 'Habilita Google en Firebase Console → Authentication → Sign-in method.',
      'auth/auth-domain-config-required': 'Falta authDomain en la configuración web de Firebase.',
      'auth/invalid-api-key': 'La API key de Firebase no es válida. Revisa la configuración web del proyecto.',
      'auth/invalid-app-credential': 'Firebase rechazó la configuración de la aplicación. Revisa el proyecto y las restricciones de la API key.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa la red y los bloqueadores del navegador.',
      'auth/web-storage-unsupported': 'El navegador no permite el almacenamiento necesario para Firebase. Revisa sus restricciones de privacidad.',
      'auth/account-exists-with-different-credential': 'Este correo ya utiliza otro proveedor en Firebase. Accede con el proveedor original; las cuentas no se vinculan automáticamente.',
      'auth/missing-email': 'Firebase no proporcionó una dirección de correo verificable. No es posible completar el acceso con esta cuenta.',
      'auth/email-not-verified': 'Firebase todavía no acredita la verificación. Abre el enlace recibido y vuelve a pulsar «Ya verifiqué mi correo».',
      'auth/verification-state-lost': 'El acceso temporal de Firebase ya no está disponible. Vuelve a iniciar sesión con tu proveedor.',
      'auth/verification-cooldown': 'Espera al menos 60 segundos entre intentos de envío del correo.',
      'auth/verification-in-progress': 'Ya se está enviando un correo de verificación.',
      'auth/too-many-requests': 'Firebase limitó las solicitudes. Espera antes de volver a intentarlo.',
      'auth/quota-exceeded': 'Se alcanzó la cuota de Firebase para el envío de correos. Inténtalo más tarde.',
      'auth/requires-recent-login': 'Firebase requiere un acceso reciente. Cancela y vuelve a iniciar sesión con tu proveedor.',
      'auth/invalid-user-token': 'El acceso temporal de Firebase ya no es válido. Cancela y vuelve a iniciar sesión con tu proveedor.',
      'auth/user-token-expired': 'El acceso temporal de Firebase venció. Cancela y vuelve a iniciar sesión con tu proveedor.',
      'auth/operation-not-supported-in-this-environment': 'Firebase no permite esta operación en este navegador o entorno.',
      'auth/invalid-recipient-email': 'Firebase no puede enviar la verificación a la dirección de esta cuenta.',
      'auth/invalid-email': 'La dirección entregada por Firebase no permite enviar un correo de verificación.'
    };
    const message = code
      ? `${messages[code] ?? (verification ? 'Firebase no pudo completar la verificación de correo.' : 'No se pudo completar el acceso con Google.')} (${code})`
      : verification ? 'No se pudo completar la verificación de correo con Firebase.'
        : 'No se pudo iniciar Firebase para acceder con Google. Revisa la configuración web.';
    return message.replaceAll('Google', { google: 'Google', github: 'GitHub', microsoft: 'Microsoft' }[provider]);
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
      case 'github': {
        const github = new GithubAuthProvider();
        github.addScope('user:email');
        return github;
      }
      case 'microsoft': {
        const microsoft = new OAuthProvider('microsoft.com');
        microsoft.addScope('email');
        return microsoft;
      }
    }
  }
}
