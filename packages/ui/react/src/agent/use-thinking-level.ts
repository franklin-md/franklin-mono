import { useCallback } from 'react';

import { THINKING_LEVELS, type ThinkingLevel } from '@franklin/mini-acp';

import { useLLMConfig } from './use-llm-config.js';

// ---------------------------------------------------------------------------
// useThinkingLevel
// ---------------------------------------------------------------------------

export type UseThinkingLevel = {
	/** Ordered list of thinking levels. */
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
		const idx = THINKING_LEVELS.indexOf(level);
		const next = THINKING_LEVELS[(idx + 1) % THINKING_LEVELS.length] ?? 'off';
		return setLevel(next);
	}, [level, setLevel]);

	return { levels: THINKING_LEVELS, level, setLevel, cycleLevel };
}
