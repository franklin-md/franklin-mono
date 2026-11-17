import type { LLMConfig } from '../../../types/context.js';
import { resolveModel } from './resolve.js';

/** Returns the built-in model's capacity without requiring credentials. */
export function getModelContextWindow(config: LLMConfig): number | undefined {
	const result = resolveModel(config);
	return result.ok ? result.model.contextWindow : undefined;
}
