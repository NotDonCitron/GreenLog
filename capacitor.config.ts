import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.greenlog.app',
  appName: 'GreenLog',
  webDir: 'out',
  server: {
    url: 'https://green-log-two.vercel.app'
  }
};

export default config;
