import { beforeEach, describe, expect, it, vi } from 'vitest';

const agentInstances: Array<{
	subscribe: ReturnType<typeof vi.fn>;
	prompt: ReturnType<typeof vi.fn>;
	abort: ReturnType<typeof vi.fn>;
}> = [];
const agentConstructor = vi.fn();

vi.mock('@mariozechner/pi-agent-core', () => ({
	Agent: class {
		readonly subscribe = vi.fn(() => () => {});
		readonly prompt = vi.fn(async () => {});
		readonly abort = vi.fn();

		constructor(options: unknown) {
			agentConstructor(options);
			agentInstances.push(this);
		}
	},
}));

import { createPiAdapter } from '../base/pi/adapter.js';

describe('createPiAdapter', () => {
	beforeEach(() => {
		agentConstructor.mockReset();
		agentInstances.length = 0;
	});

	it('keeps api key resolution enabled when a custom streamFn is provided', async () => {
		const streamFn = vi.fn();
		const adapter = createPiAdapter({
			server: {
				toolExecute: vi.fn(async () => ({ toolCallId: 'tool-1', content: [] })),
			},
			ctx: {
				history: { systemPrompt: '', messages: [] },
				tools: [],
				config: {
					provider: 'openai-codex',
					model: 'gpt-5.4',
					apiKey: 'oauth-token',
				},
			},
			streamFn,
		});

		for await (const _event of adapter.prompt({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		})) {
			// No events are emitted by the mocked agent.
		}

		expect(agentConstructor).toHaveBeenCalledOnce();
		const [options] = agentConstructor.mock.calls[0] ?? [];
		expect(options).toMatchObject({ streamFn });
		const getApiKey = (
			options as { getApiKey?: (provider: string) => string | undefined }
		).getApiKey;
		expect(getApiKey).toBeDefined();
		expect(getApiKey?.('openai-codex')).toBe('oauth-token');
	});
});
