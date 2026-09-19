import { Injectable } from '@angular/core';
import { Capacitor, SystemBars } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };

/**
 * Ao maximizar o vídeo (iframe do player), força o celular na horizontal e esconde as barras do
 * Android — sem isso os controles do player ficam atrás da barra de navegação do sistema.
 * Ao sair da tela cheia, restaura as barras e a rotação livre. No navegador (sem app nativo) não faz nada.
 */
@Injectable({ providedIn: 'root' })
export class VideoFullscreenService {
  private active = false;
  private readonly listener = () => void this.sync();

  /** Começa a observar a tela cheia do documento. Chame `stop()` ao sair da página do player. */
  start() {
    if (!Capacitor.isNativePlatform()) return;
    document.addEventListener('fullscreenchange', this.listener);
    document.addEventListener('webkitfullscreenchange', this.listener);
  }

  stop() {
    document.removeEventListener('fullscreenchange', this.listener);
    document.removeEventListener('webkitfullscreenchange', this.listener);
    if (this.active) void this.apply(false);
  }

  private sync() {
    const doc = document as FullscreenDocument;
    return this.apply(!!(doc.fullscreenElement ?? doc.webkitFullscreenElement));
  }

  private async apply(fullscreen: boolean) {
    if (fullscreen === this.active) return;
    this.active = fullscreen;
    try {
      if (fullscreen) {
        await SystemBars.hide();
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } else {
        await SystemBars.show();
        // Volta para retrato e devolve a rotação livre (respeitando o ajuste do aparelho).
        await ScreenOrientation.lock({ orientation: 'portrait' });
        await ScreenOrientation.unlock();
      }
    } catch (err) {
      console.warn('Não foi possível ajustar a orientação/barras do sistema', err);
    }
  }
}
