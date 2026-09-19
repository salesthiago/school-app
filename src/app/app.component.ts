import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Injetado só para aplicar o tema salvo já na abertura do app.
  constructor(_theme: ThemeService) {}
}
