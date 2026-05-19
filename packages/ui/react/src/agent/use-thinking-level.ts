import { useCallback } from 'react';

import type { ThinkingLevel } from '@franklin/mini-acp';

import { useLLMConfig } from './use-llm-config.js';

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
	/** Set the thinking level. */
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
	const { config, patchConfig } = useLLMConfig();
	const level = config.reasoning ?? 'medium';

	const setLevel = useCallback(
		(next: ThinkingLevel) => patchConfig({ reasoning: next }),
		[patchConfig],
	);

	const cycleLevel = useCallback(() => {
		const idx = TOGGLE_LEVELS.indexOf(level);
		const next = TOGGLE_LEVELS[(idx + 1) % TOGGLE_LEVELS.length] ?? 'off';
		return setLevel(next);
	}, [level, setLevel]);

	return { levels: TOGGLE_LEVELS, level, setLevel, cycleLevel };
}
