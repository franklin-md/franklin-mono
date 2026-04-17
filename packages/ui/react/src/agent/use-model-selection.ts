import { useCallback, useMemo, useRef } from 'react';

import { getLLMConfig } from '@franklin/agent/browser';

import { useRuntimeSync } from './use-runtime-sync.js';
import { useSettings } from './use-settings.js';

// ---------------------------------------------------------------------------
// useModelSelection
// ---------------------------------------------------------------------------

export type UseModelSelection = {
	readonly provider: string;
	readonly model: string;
	readonly setModel: (provider: string, model: string) => Promise<void>;
};

/**
 * Headless hook for reading and writing the active agent's model selection.
 *
 * Syncs with the agent runtime on mount and whenever the runtime notifies.
 * Writes propagate to both the runtime (`setLLMConfig`) and the app-level
 * settings store (`defaultLLMConfig`).
 *
 * Must be used inside an `<AgentProvider>` and `<FranklinProvider>`.
 */
export function useModelSelection(): UseModelSelection {
	const settings = useSettings();
	const defaults = settings.get().defaultLLMConfig;

	const settingsRef = useRef(settings);
	settingsRef.current = settings;

	const initial = {
		provider: defaults.provider ?? '',
		model: defaults.model ?? '',
	};

	const { value, set } = useRuntimeSync<{
		provider: string;
		model: string;
	}>({
		extract: async (runtime) => {
			const config = await getLLMConfig(runtime);
			return {
				provider: config.provider ?? initial.provider,
				model: config.model ?? initial.model,
			};
		},
		apply: async (runtime, { provider, model }) => {
			settingsRef.current.set((draft: ReturnType<typeof settings.get>) => {
				draft.defaultLLMConfig = {
					...draft.defaultLLMConfig,
					provider,
					model,
				};
			});
			await runtime.setLLMConfig({ provider, model });
		},
		initial,
	});

	const setModel = useCallback(
		(provider: string, model: string) => set({ provider, model }),
		[set],
	);

	return useMemo(
		() => ({ provider: value.provider, model: value.model, setModel }),
		[value.provider, value.model, setModel],
	);
}
