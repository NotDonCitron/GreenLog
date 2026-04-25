import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.error('Haptics not supported', e);
    }
  }
};

export const triggerSuccessHaptic = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type: 'success' as any });
    } catch (e) {
      console.error('Success haptics not supported', e);
    }
  }
};
