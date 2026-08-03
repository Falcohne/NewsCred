import * as Sharing from 'expo-sharing';
import { ViewShotRef } from 'react-native-view-shot';

/**
 * Captures a ViewShot-wrapped view and hands the resulting PNG to the OS
 * share sheet via expo-sharing (NOT react-native-share, which is a bare
 * native module that Expo Go cannot load - it crashes at bundle-eval time
 * with "TurboModuleRegistry.getEnforcing(...): 'RNShare' could not be
 * found" since Expo Go only ships modules it explicitly bundles).
 * expo-sharing is an Expo SDK package, so it works in Expo Go with no
 * native build step.
 */
export async function shareViewAsImage(shotRef: React.RefObject<ViewShotRef | null>): Promise<void> {
  try {
    const uri = await shotRef.current?.capture?.();
    if (!uri) return;
    if (!(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
  } catch {
    // user cancelled, or sharing unavailable on this platform - nothing to do
  }
}
