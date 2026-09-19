import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
// Login com Google suspenso por enquanto (reativar junto com <app-google-button> no HTML):
// import { GoogleButtonComponent } from '../google-button/google-button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    // GoogleButtonComponent,
  ],
})
export class RegisterPage {
  name = '';
  email = '';
  phone = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  submit() {
    if (!this.name || !this.email || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService
      .register({ name: this.name, email: this.email, phone: this.phone || undefined, password: this.password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/student/dashboard');
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err?.status === 409 ? 'Já existe uma conta com este e-mail.' : 'Não foi possível criar sua conta.',
          );
        },
      });
  }
}
