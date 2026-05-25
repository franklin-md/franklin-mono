import { describe, it, expect } from 'vitest';
import {
	createCoreStateModule,
	type CoreRuntime,
} from '../modules/core/index.js';
import { createRuntime } from '../testing/index.js';
import { type MiniACPConnector, ZERO_USAGE } from '@franklin/mini-acp';
import {
	createMockMiniACP,
	text,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { getLLMConfig } from '../settings/llm-config.js';

function createMockConnector(): MiniACPConnector {
	return createMockMiniACP({
		defaultTurn: turn([text('hi'), turnEnd()]),
	}).connector;
}

async function makeRuntime(
	llmConfig: Record<string, unknown>,
): Promise<CoreRuntime> {
	const system = createCoreStateModule(createMockConnector());
	return createRuntime(
		system,
		{
			core: {
				messages: [],
				llmConfig,
				usage: ZERO_USAGE,
				toolFilter: { disabled: [] },
			},
		},
		[],
	);
}

describe('getLLMConfig', () => {
	it('returns the current llmConfig from runtime state', async () => {
		const runtime = await makeRuntime({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});

		const config = await getLLMConfig(runtime);

		expect(config).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});

		await runtime.dispose();
	});

	it('returns empty object when no config is set', async () => {
		const runtime = await makeRuntime({});

		const config = await getLLMConfig(runtime);

		expect(config).toEqual({});

		await runtime.dispose();
	});
});
