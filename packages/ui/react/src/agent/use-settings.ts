import type { SettingsStore } from '@franklin/agent/browser';
import { useApp } from './franklin-context.js';

/** Returns the app-level settings store from the nearest `<FranklinProvider>`. */
export function useSettings(): SettingsStore {
	return useApp().settings;
}
