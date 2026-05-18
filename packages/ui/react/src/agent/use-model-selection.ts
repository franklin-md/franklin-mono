import { useCallback, useMemo, useRef } from 'react';

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

	const settingsRef = useRef(settings);
	settingsRef.current = settings;

	const initial = {
		provider: defaults.provider,
		model: defaults.model,
	};

	const { value, set } = useLLMConfig(initial);
	const provider = value.provider ?? initial.provider;
	const model = value.model ?? initial.model;

	const setModel = useCallback(
		(nextProvider: string, nextModel: string) => {
			settingsRef.current.set((draft: ReturnType<typeof settings.get>) => {
				draft.defaultLLMConfig = {
					...draft.defaultLLMConfig,
					provider: nextProvider,
					model: nextModel,
				};
			});
			return set({
				...value,
				provider: nextProvider,
				model: nextModel,
			});
		},
		[set, value],
	);

	return useMemo(
		() => ({ provider, model, setModel }),
		[provider, model, setModel],
	);
}
