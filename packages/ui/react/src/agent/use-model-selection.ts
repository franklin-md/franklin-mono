import { useCallback } from 'react';

import { useLLMConfig } from './use-llm-config.js';
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

	const { config, patchConfig } = useLLMConfig();
	const provider = config.provider ?? defaults.provider;
	const model = config.model ?? defaults.model;

	const setModel = useCallback(
		(nextProvider: string, nextModel: string) => {
			settings.set((draft: ReturnType<typeof settings.get>) => {
				draft.defaultLLMConfig = {
					...draft.defaultLLMConfig,
					provider: nextProvider,
					model: nextModel,
				};
			});
			return patchConfig({
				provider: nextProvider,
				model: nextModel,
			});
		},
		[settings, patchConfig],
	);

	return { provider, model, setModel };
}
