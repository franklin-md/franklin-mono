import { describe, it, expect, vi } from 'vitest';
import {
	createCoreSystem,
	createRuntime,
	type CoreRuntime,
} from '@franklin/extensions';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
	type Update,
} from '@franklin/mini-acp';
import { getLLMConfig } from '../settings/llm-config.js';

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter(
			(_ctx) => ({
				async *prompt() {
					yield {
						type: 'update' as const,
						messageId: 'm1',
						message: {
							role: 'assistant' as const,
							content: [{ type: 'text' as const, text: 'hi' }],
						},
					} satisfies Update;
					yield { type: 'turnEnd' as const, stopCode: StopCode.Finished };
				},
				async cancel() {},
			}),
			connection.remote,
		);
		connection.bind(adapter);

		return { ...clientSide, dispose: vi.fn(async () => {}) };
	};
}

async function makeRuntime(
	llmConfig: Record<string, unknown>,
): Promise<CoreRuntime> {
	const system = createCoreSystem(createMockSpawn());
	return createRuntime(
		system,
		{
			core: {
				messages: [],
				llmConfig,
				usage: ZERO_USAGE,
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
