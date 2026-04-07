import type { SettingsStore } from '@franklin/agent/browser';

import { useApp } from './franklin-context.js';
import { useStore } from './use-store.js';

/** Returns a reactive app-level settings store from the nearest `<FranklinProvider>`. */
export function useSettings(): SettingsStore {
	return useStore(useApp().settings);
}
