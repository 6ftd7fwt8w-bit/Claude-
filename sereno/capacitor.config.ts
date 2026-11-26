import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Cámbialo por uno tuyo (p. ej. com.tunombre.sereno) antes de firmar la app en Xcode.
  appId: 'app.sereno.ios',
  appName: 'Sereno',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#EEF3EC',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#5f9f89',
    },
  },
};

export default config;
