import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.gpschool.app',
  appName: 'GPschool',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#03060F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    SocialLogin: {
      // Só o Google: sem os SDKs de Facebook/Apple/Twitter no APK.
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
