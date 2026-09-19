import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'gpschool.theme';
const DARK_CLASS = 'ion-palette-dark';

/** Tema claro por padrão; a escolha do usuário fica salva no aparelho. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(this.readStored() === 'dark');

  constructor() {
    this.apply(this.isDark());
  }

  setDark(dark: boolean) {
    this.isDark.set(dark);
    this.apply(dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // sem storage disponível: a escolha vale só até fechar o app
    }
  }

  private apply(dark: boolean) {
    document.documentElement.classList.toggle(DARK_CLASS, dark);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }
}
