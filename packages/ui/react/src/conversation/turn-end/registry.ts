import { type AgentStopCode, agentStopCategory } from '@franklin/agent';

import type { TurnEndRenderer, TurnEndRendererRegistry } from './types.js';

export function resolveTurnEndRenderer(
	registry: TurnEndRendererRegistry,
	code: AgentStopCode,
): TurnEndRenderer | null {
	return (
		registry.byCode?.[code] ??
		registry.byRange?.[Math.floor((code as number) / 100)] ??
		registry.byCategory?.[agentStopCategory(code)] ??
		registry.default ??
		null
	);
}
