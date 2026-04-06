import { type StopCode, stopCategory } from '@franklin/mini-acp';

import type { TurnEndRenderer, TurnEndRendererRegistry } from './types.js';

export function resolveTurnEndRenderer(
	registry: TurnEndRendererRegistry,
	code: StopCode,
): TurnEndRenderer | null {
	return (
		registry.byCode?.[code] ??
		registry.byRange?.[Math.floor((code as number) / 100)] ??
		registry.byCategory?.[stopCategory(code)] ??
		registry.default ??
		null
	);
}
