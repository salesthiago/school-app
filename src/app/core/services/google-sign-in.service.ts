import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens } from '../models/user.model';
import { AuthService } from './auth.service';

/** O usuário fechou a janela de escolha da conta Google (não é erro). */
export class GoogleSignInCancelled extends Error {}

/** Entrar/cadastrar com a conta Google (só no app nativo; o backend valida o ID token). */
@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private initialized = false;

  constructor(private authService: AuthService) {}

  get available(): boolean {
    return Capacitor.isNativePlatform() && !!environment.googleWebClientId;
  }

  /** Abre o seletor de contas do Google e troca o ID token por uma sessão do GPschool. */
  signIn(): Observable<AuthTokens> {
    return from(this.getIdToken()).pipe(switchMap((idToken) => this.authService.loginWithGoogle(idToken)));
  }

  /** Esquece a conta Google escolhida, para o próximo login mostrar o seletor de contas. */
  async signOut() {
    if (!this.available || !this.initialized) return;
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // sem sessão Google no aparelho: nada a fazer
    }
  }

  private async getIdToken(): Promise<string> {
    if (!this.initialized) {
      await SocialLogin.initialize({ google: { webClientId: environment.googleWebClientId } });
      this.initialized = true;
    }
    try {
      // Sem `scopes` de propósito: o plugin já pede e-mail, perfil e openid por padrão, e qualquer
      // lista explícita exige alterar o MainActivity ("You CANNOT use scopes without modifying...").
      const { result } = await SocialLogin.login({
        provider: 'google',
        options: {},
      });
      const idToken = 'idToken' in result ? result.idToken : null;
      if (!idToken) throw new Error('O Google não devolveu o token de identificação.');
      return idToken;
    } catch (err) {
      console.warn('Login com Google falhou', err);
      if (isCancellation(err)) throw new GoogleSignInCancelled();
      throw err;
    }
  }
}

function isCancellation(err: unknown): boolean {
  const text = `${(err as { code?: unknown })?.code ?? ''} ${(err as { message?: unknown })?.message ?? err}`.toLowerCase();
  return text.includes('cancel');
}
