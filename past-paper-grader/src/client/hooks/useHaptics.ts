import { useCallback, useRef, useEffect } from "react";
import { WebHaptics, type HapticInput, type TriggerOptions } from "web-haptics";

const hapticsInstance = typeof window !== "undefined" ? new WebHaptics() : null;

export function useHaptics() {
  const trigger = useCallback((input?: HapticInput, options?: TriggerOptions) => {
    if (hapticsInstance && WebHaptics.isSupported) {
      hapticsInstance.trigger(input, options);
    }
  }, []);

  return {
    success: () => trigger("success"),
    warning: () => trigger("warning"),
    error: () => trigger("error"),
    light: () => trigger("light"),
    medium: () => trigger("medium"),
    heavy: () => trigger("heavy"),
    soft: () => trigger("soft"),
    rigid: () => trigger("rigid"),
    trigger,
    isSupported: hapticsInstance ? WebHaptics.isSupported : false,
  };
}
