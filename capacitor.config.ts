import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.gpschool.app',
  appName: 'GPschool',
  webDir: 'www',
  plugins: {
    SocialLogin: {
      // Só o Google: sem os SDKs de Facebook/Apple/Twitter no APK.
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
