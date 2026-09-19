import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  IonToggle,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, mailOutline, callOutline, moonOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { GoogleSignInService } from '../../core/services/google-sign-in.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  imports: [
    CommonModule,
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
    IonToggle,
  ],
})
export class ProfilePage {
  constructor(
    public authService: AuthService,
    public theme: ThemeService,
    private googleSignIn: GoogleSignInService,
    private router: Router,
  ) {
    addIcons({ logOutOutline, mailOutline, callOutline, moonOutline });
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  logout() {
    this.authService.logout();
    void this.googleSignIn.signOut();
    this.router.navigateByUrl('/auth/login');
  }
}
