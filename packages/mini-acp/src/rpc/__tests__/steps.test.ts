import { collectEvents } from '../../__tests__/utils/collect-events.js';
import { describe, expect, it, vi } from 'vitest';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { createPiAgent } from '../../backend/pi/agent.js';
import { createScriptedProvider } from '../../mock/provider.js';
import { bindMiniACPRpcAgent, createMiniACPRpcConnector } from '../index.js';
import { collect } from '../../utils/collect.js';
import { StopCode } from '../../types/stop-code.js';
import type { MiniACPAgent } from '../../protocol/index.js';
import type { CreatePiAgentOptions } from '../../backend/pi/agent.js';
import type { StreamEvent } from '../../types/stream.js';

const config = {
	provider: 'openrouter',
	model: 'openrouter/free',
	apiKey: 'stub-key',
};
const prompt = {
	role: 'user' as const,
	content: [{ type: 'text' as const, text: 'run' }],
};
const tool = {
	name: 'echo',
	description: 'Echo',
	inputSchema: { type: 'object' },
};
const calls = ['c1', 'c2'].map((id) => ({
	type: 'toolCall' as const,
	id,
	name: 'echo',
	arguments: {},
}));

async function connect(server: MiniACPAgent, options: CreatePiAgentOptions) {
	const connector = createMiniACPRpcConnector(() => {
		const { a, b } = createDuplexPair<JsonRpcMessage>();
		const binding = bindMiniACPRpcAgent(b);
		binding.bind(createPiAgent(binding.remote, options));
		return a;
	});
	const client = await connector(server);
	await client.initialize();
	await client.setContext({ config, tools: [tool] });
	return client;
}

function noopServer(): MiniACPAgent {
	return {
		toolExecute: async ({ call }) => ({ toolCallId: call.id, content: [] }),
	};
}

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

describe('explicit steps over JSON-RPC', () => {
	it('finishes the entire tool batch, rejects overlapping drives and permits immediate context/continue at terminals', async () => {
		const firstTool = deferred<undefined>();
		const secondTool = deferred<undefined>();
		const started: string[] = [];
		const finished: string[] = [];
		const provider = createScriptedProvider([
			{ content: calls, stopReason: 'toolUse' },
			{},
			{},
		]);
		const client = await connect(
			{
				toolExecute: async ({ call }) => {
					started.push(call.id);
					await (call.id === 'c1' ? firstTool.promise : secondTool.promise);
					finished.push(call.id);
					return {
						toolCallId: call.id,
						content: [{ type: 'text', text: call.id }],
					};
				},
			},
			provider,
		);
		const events: StreamEvent[] = [];
		const boundaries: Array<{ finished: string[]; requests: number }> = [];
		const noops: StreamEvent[][] = [];
		const execution = (async () => {
			for await (const event of client.prompt(prompt)) {
				events.push(event);
				if (event.type === 'stepEnd') {
					boundaries.push({
						finished: [...finished],
						requests: provider.requests.length,
					});
					await client.setContext({
						systemPrompt: 'edited while idle',
						config: { apiKey: 'next-key' },
						tools: [],
					});
					for await (const next of client.continue()) {
						events.push(next);
						if (next.type === 'turnEnd') {
							await client.setContext({
								messages: [],
								systemPrompt: 'new turn',
							});
							noops.push(await collectEvents(client.continue()));
							// Reenter before either of the preceding streams has closed.
							await collect(client.prompt(prompt));
						}
					}
				}
			}
		})();
		try {
			await vi.waitFor(() => expect(started).toEqual(['c1', 'c2']));
			await expect(collect(client.continue())).rejects.toThrow(
				'already in progress',
			);
			await expect(collect(client.prompt(prompt))).rejects.toThrow(
				'already in progress',
			);
			await expect(client.setContext({ messages: [] })).rejects.toThrow(
				'only accepts tools',
			);
			firstTool.resolve(undefined);
			await vi.waitFor(() => expect(finished).toEqual(['c1']));
			expect(
				events.filter((e) => e.type === 'stepEnd' || e.type === 'turnEnd'),
			).toEqual([]);
			secondTool.resolve(undefined);
			await execution;
			expect(boundaries).toEqual([{ finished: ['c1', 'c2'], requests: 1 }]);
			expect(noops).toEqual([[]]);
			expect(events.map((e) => e.type)).toEqual([
				'turnStart',
				'stepEnd',
				'chunk',
				'update',
				'turnEnd',
			]);
			expect(provider.requests).toHaveLength(3);
			expect(provider.requests[1]).toMatchObject({
				systemPrompt: 'edited while idle',
				apiKey: 'next-key',
				tools: [],
			});
			expect(
				provider.requests[1]?.messages.filter((m) => m.role === 'user'),
			).toHaveLength(1);
			expect(
				provider.requests[1]?.messages.filter((m) => m.role === 'toolResult'),
			).toHaveLength(2);
			expect(provider.requests[2]?.messages).toHaveLength(1);
		} finally {
			firstTool.resolve(undefined);
			secondTool.resolve(undefined);
			await client.dispose();
		}
	});

	it('closing an old stream at stepEnd cannot abort the immediately continued run', async () => {
		const provider = createScriptedProvider([
			{ content: [calls[0]!], stopReason: 'toolUse' },
		]);
		const reachedNext = deferred<AbortSignal | undefined>();
		const finishNext = deferred<undefined>();
		const client = await connect(noopServer(), {
			streamFn: async (model, context, options) => {
				if (provider.requests.length === 0)
					return provider.streamFn(model, context, options);
				reachedNext.resolve(options?.signal);
				await finishNext.promise;
				return createScriptedProvider([{}]).streamFn(model, context, options);
			},
		});
		const old = client.prompt(prompt)[Symbol.asyncIterator]();
		try {
			let event = await old.next();
			while (!event.done && event.value.type !== 'stepEnd')
				event = await old.next();
			const continued = collect(client.continue());
			const signal = await reachedNext.promise;
			await old.return?.();
			expect(signal?.aborted).toBe(false);
			finishNext.resolve(undefined);
			expect((await continued).turnEnd?.stopCode).toBe(StopCode.Finished);
		} finally {
			finishNext.resolve(undefined);
			await client.dispose();
		}
	});

	it('cancels active tools only after they settle, without inferring a follow-up', async () => {
		const gate = deferred<undefined>();
		const started = deferred<undefined>();
		const provider = createScriptedProvider([
			{ content: [calls[0]!], stopReason: 'toolUse' },
		]);
		let settled = false;
		const terminalSettlement: boolean[] = [];
		const client = await connect(
			{
				toolExecute: async ({ call }) => {
					started.resolve(undefined);
					await gate.promise;
					settled = true;
					return { toolCallId: call.id, content: [] };
				},
			},
			provider,
		);
		const events: StreamEvent[] = [];
		const execution = (async () => {
			for await (const event of client.prompt(prompt)) {
				events.push(event);
				if (event.type === 'turnEnd') {
					terminalSettlement.push(settled);
					await client.setContext({ systemPrompt: 'idle after cancel' });
				}
			}
		})();
		try {
			await started.promise;
			await client.cancel();
			await expect(client.setContext({ messages: [] })).rejects.toThrow(
				'only accepts tools',
			);
			gate.resolve(undefined);
			await execution;
			expect(terminalSettlement).toEqual([true]);
			expect(
				events.filter((e) => e.type === 'stepEnd' || e.type === 'turnEnd'),
			).toEqual([
				expect.objectContaining({
					type: 'turnEnd',
					stopCode: StopCode.Cancelled,
				}),
			]);
			expect(await collectEvents(client.continue())).toEqual([]);
			expect(provider.requests).toHaveLength(1);
		} finally {
			gate.resolve(undefined);
			await client.dispose();
		}
	});

	it('cancels a provider stream and allows reentry on its turnEnd', async () => {
		const started = deferred<undefined>();
		const client = await connect(noopServer(), {
			streamFn: (model, _context, options) => {
				const stream = createAssistantMessageEventStream();
				options?.signal?.addEventListener(
					'abort',
					() => {
						stream.push({
							type: 'error',
							reason: 'aborted',
							error: {
								role: 'assistant',
								content: [],
								api: model.api,
								provider: model.provider,
								model: model.id,
								stopReason: 'aborted',
								timestamp: 0,
								usage: {
									input: 0,
									output: 0,
									cacheRead: 0,
									cacheWrite: 0,
									totalTokens: 0,
									cost: {
										input: 0,
										output: 0,
										cacheRead: 0,
										cacheWrite: 0,
										total: 0,
									},
								},
							},
						});
					},
					{ once: true },
				);
				started.resolve(undefined);
				return stream;
			},
		});
		try {
			const execution = collect(client.prompt(prompt));
			await started.promise;
			await client.cancel();
			expect((await execution).turnEnd?.stopCode).toBe(StopCode.Cancelled);
			await client.setContext({ systemPrompt: 'idle' });
			expect(await collectEvents(client.continue())).toEqual([]);
		} finally {
			await client.dispose();
		}
	});
});
