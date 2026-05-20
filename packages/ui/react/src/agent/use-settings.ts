import type { AppSettings } from '@franklin/agent';
import type { Store } from '@franklin/agent';

import { useHarness } from './harness-context.js';
import { useStore } from '../utils/use-store.js';

/** Returns a reactive app-level settings store from the nearest `<HarnessProvider>`. */
export function useSettings(): Store<AppSettings> {
	return useStore(useHarness().settings);
}
