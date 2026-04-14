import type { AppSettings } from '@franklin/agent/browser';
import type { Store } from '@franklin/extensions';

import { useApp } from './franklin-context.js';
import { useStore } from '../utils/use-store.js';

/** Returns a reactive app-level settings store from the nearest `<FranklinProvider>`. */
export function useSettings(): Store<AppSettings> {
	return useStore(useApp().settings);
}
