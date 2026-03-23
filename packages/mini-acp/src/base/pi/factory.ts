// ---------------------------------------------------------------------------
// Pi factory — creates a BaseAgentFactory backed by pi-agent-core.
// ---------------------------------------------------------------------------

import type { Model } from '@mariozechner/pi-ai';
import type { StreamFn } from '@mariozechner/pi-agent-core';
import type { BaseAgentFactory } from '../../protocol/adapter.js';
import { createPiAdapter } from './adapter.js';

export interface PiFactoryOptions {
	/** Pre-resolved pi-ai Model */
	model: Model<string>;
	/** Custom stream function — inject for testing without real LLM calls */
	streamFn?: StreamFn;
}

/**
 * Creates a BaseAgentFactory backed by pi-agent-core.
 *
 * Each invocation of the returned factory creates a fresh Pi adapter
 * configured with the given model and optional stream function.
 */
export function createPiFactory(options: PiFactoryOptions): BaseAgentFactory {
	const { model, streamFn } = options;
	return (ctx, client) => createPiAdapter({ client, model, ctx, streamFn });
}
