import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonButton, IonSpinner, IonText } from '@ionic/angular';
import { GoogleSignInCancelled, GoogleSignInService } from '../../core/services/google-sign-in.service';

/**
 * "Continuar com Google" (login e cadastro): entra na conta, cria uma se não existir ou vincula à
 * conta com o mesmo e-mail. Só aparece no app nativo com o Google configurado.
 */
@Component({
  selector: 'app-google-button',
  standalone: true,
  imports: [IonButton, IonSpinner, IonText],
  template: `
    @if (google.available) {
      <div class="divider"><span>ou</span></div>

      <ion-button expand="block" fill="outline" [disabled]="loading()" (click)="signIn()">
        @if (loading()) {
          <ion-spinner name="crescent"></ion-spinner>
        } @else {
          <img slot="start" class="google-logo" src="assets/icon/google.svg" alt="" />
          Continuar com Google
        }
      </ion-button>

      @if (errorMessage()) {
        <ion-text color="danger">
          <p class="error">{{ errorMessage() }}</p>
        </ion-text>
      }
    }
  `,
  styles: `
    .divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.25rem 0 1rem;
      color: var(--ion-color-medium);
      font-size: 0.85rem;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--ds-border);
      }
    }

    .google-logo {
      width: 1.25rem;
      height: 1.25rem;
      margin-right: 0.5rem;
    }

    .error {
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
      text-align: center;
    }
  `,
})
export class GoogleButtonComponent {
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    public google: GoogleSignInService,
    private router: Router,
  ) {}

  signIn() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.google.signIn().subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/student/dashboard');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          err instanceof GoogleSignInCancelled
            ? 'Login com Google cancelado.'
            : err instanceof HttpErrorResponse && err.status === 503
              ? 'Login com Google indisponível no momento.'
              : 'Não foi possível entrar com o Google. Tente novamente.',
        );
      },
    });
  }
}
