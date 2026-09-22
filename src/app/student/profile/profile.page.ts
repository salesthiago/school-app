import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonButton,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonToggle,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  mailOutline,
  callOutline,
  moonOutline,
  cameraOutline,
  logoInstagram,
  logoTwitter,
  lockClosedOutline,
  timeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';
import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user.model';

/** Aceita "@usuario", "usuario" ou a URL do perfil; o backend guarda só o que vier digitado. */
function handleOf(value: string | undefined): string {
  return (value ?? '').trim().replace(/^@/, '');
}

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonButton,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonSpinner,
    IonToggle,
  ],
})
export class ProfilePage {
  uploadingAvatar = signal(false);
  savingProfile = signal(false);
  savingPassword = signal(false);
  changingPassword = signal(false);
  profileMessage = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  passwordMessage = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  passwordChangedLabel = computed(() => this.relativeLabel(this.authService.currentUser()?.passwordChangedAt));

  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    instagram: [''],
    twitter: [''],
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  constructor(
    public authService: AuthService,
    public theme: ThemeService,
    private googleSignIn: GoogleSignInService,
    private usersService: UsersService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    addIcons({
      logOutOutline,
      mailOutline,
      callOutline,
      moonOutline,
      cameraOutline,
      logoInstagram,
      logoTwitter,
      lockClosedOutline,
      timeOutline,
      chevronForwardOutline,
    });
    // O perfil completo chega depois do JWT (refreshProfile) — só sobrescreve o form se o usuário ainda não mexeu.
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.profileForm.dirty) this.fillProfileForm(user);
    });
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  private fillProfileForm(user: User) {
    this.profileForm.patchValue({
      name: user.name,
      phone: user.phone ?? '',
      instagram: user.socialLinks?.instagram ?? '',
      twitter: user.socialLinks?.twitter ?? '',
    });
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.profileMessage.set(null);
    this.usersService.uploadAvatar(file).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.uploadingAvatar.set(false);
      },
      error: (err) => {
        this.uploadingAvatar.set(false);
        this.profileMessage.set({ kind: 'error', text: err?.error?.message ?? 'Não foi possível enviar a foto.' });
      },
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    const { name, phone, instagram, twitter } = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.profileMessage.set(null);
    this.usersService
      .updateProfile({ name, phone, instagram: handleOf(instagram), twitter: handleOf(twitter) })
      .subscribe({
        next: (user) => {
          this.profileForm.markAsPristine();
          this.authService.currentUser.set(user);
          this.savingProfile.set(false);
          this.profileMessage.set({ kind: 'success', text: 'Perfil atualizado.' });
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.profileMessage.set({ kind: 'error', text: err?.error?.message ?? 'Não foi possível salvar o perfil.' });
        },
      });
  }

  openPasswordForm() {
    this.passwordForm.reset();
    this.passwordMessage.set(null);
    this.changingPassword.set(true);
  }

  closePasswordForm() {
    this.changingPassword.set(false);
  }

  submitPassword() {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordMessage.set({ kind: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.usersService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.savingPassword.set(false);
        this.changingPassword.set(false);
        this.profileMessage.set({ kind: 'success', text: 'Senha alterada com sucesso.' });
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordMessage.set({ kind: 'error', text: err?.error?.message ?? 'Não foi possível alterar a senha.' });
      },
    });
  }

  private relativeLabel(iso: string | undefined): string {
    if (!iso) return 'Nunca alterada';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days < 1) return 'Alterada hoje';
    if (days === 1) return 'Alterada há 1 dia';
    if (days < 30) return `Alterada há ${days} dias`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'Alterada há 1 mês' : `Alterada há ${months} meses`;
    const years = Math.floor(months / 12);
    return years === 1 ? 'Alterada há 1 ano' : `Alterada há ${years} anos`;
  }

  logout() {
    this.authService.logout();
    void this.googleSignIn.signOut();
    this.router.navigateByUrl('/auth/login');
  }
}
