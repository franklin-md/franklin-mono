import { useCallback } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';
import { getLLMConfig, setLLMConfig } from '@franklin/agent/browser';

import { useRuntimeSync } from './use-runtime-sync.js';

// ---------------------------------------------------------------------------
// useThinkingLevel
// ---------------------------------------------------------------------------

/** The subset of levels exposed by the toggle UI. */
const TOGGLE_LEVELS: readonly ThinkingLevel[] = [
	'off',
	'low',
	'medium',
	'high',
	'xhigh',
] as const;

export type UseThinkingLevel = {
	/** Ordered list of toggle-able thinking levels. */
	readonly levels: readonly ThinkingLevel[];
	/** Current thinking level. */
	readonly level: ThinkingLevel;
	/** Set the thinking level. Await for confirmation; don't await for optimistic. */
	readonly setLevel: (level: ThinkingLevel) => Promise<void>;
	/** Cycle to the next toggle level (wraps around). */
	readonly cycleLevel: () => Promise<void>;
};

/**
 * Headless hook for reading and writing the active agent's thinking level.
 *
 * Exposes a useState-style `[level, setLevel]` interface plus a convenience
 * `cycleLevel` that advances through the ordered list, wrapping modularly.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useThinkingLevel(): UseThinkingLevel {
	const { value, set } = useRuntimeSync<ThinkingLevel>({
		extract: async (runtime) => {
			const config = await getLLMConfig(runtime);
			return config.reasoning ?? 'medium';
		},
		apply: async (runtime, level) => {
			await setLLMConfig(runtime, { reasoning: level });
		},
		initial: 'medium',
	});

	const setLevel = useCallback((next: ThinkingLevel) => set(next), [set]);

	const cycleLevel = useCallback(() => {
		const idx = TOGGLE_LEVELS.indexOf(value);
		const next = TOGGLE_LEVELS[(idx + 1) % TOGGLE_LEVELS.length] ?? 'off';
		return set(next);
	}, [set, value]);

	return { levels: TOGGLE_LEVELS, level: value, setLevel, cycleLevel };
}
