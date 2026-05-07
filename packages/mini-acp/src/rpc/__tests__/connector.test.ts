import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import { describe, expect, it, vi } from 'vitest';
import { StopCode } from '../../types/index.js';
import type { StreamEvent, ToolExecuteParams } from '../../types/index.js';
import { bindMiniACPRpcAgent, createMiniACPRpcConnector } from '../index.js';
import type { MuClient } from '../../protocol/types.js';
import type { ClientProtocol } from '../types.js';

async function collect(
	iter: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
	const items: StreamEvent[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function createTransportFactory(agent: MuClient) {
	const dispose = vi.fn(async () => {});

	return {
		spawn: (): ClientProtocol => {
			const { a: clientSide, b: agentSide } =
				createDuplexPair<JsonRpcMessage>();
			const connection = bindMiniACPRpcAgent(agentSide);
			connection.bind(agent);

			return {
				...clientSide,
				dispose: async () => {
					await clientSide.dispose();
					await dispose();
				},
			};
		},
		dispose,
	};
}

describe('createMiniACPRpcConnector', () => {
	it('creates a fresh transport for each client binding', async () => {
		const initialize = vi.fn(async () => {});
		const { spawn } = createTransportFactory({
			initialize,
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(async function* () {}),
			cancel: vi.fn(async () => {}),
		});
		const spawnSpy = vi.fn(spawn);
		const connect = createMiniACPRpcConnector(spawnSpy);

		const first = await connect({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [],
			})),
		});
		const second = await connect({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [],
			})),
		});

		await first.initialize();
		await second.initialize();

		expect(spawnSpy).toHaveBeenCalledTimes(2);
		expect(initialize).toHaveBeenCalledTimes(2);

		await first.dispose();
		await second.dispose();
	});

	it('binds reverse client handlers for agent tool calls', async () => {
		let remote: ReturnType<typeof bindMiniACPRpcAgent>['remote'] | undefined;
		const connect = createMiniACPRpcConnector(() => {
			const { a: clientSide, b: agentSide } =
				createDuplexPair<JsonRpcMessage>();
			const connection = bindMiniACPRpcAgent(agentSide);
			remote = connection.remote;
			connection.bind({
				initialize: vi.fn(async () => {}),
				setContext: vi.fn(async () => {}),
				async *prompt() {
					if (!remote) throw new Error('missing remote client');
					const result = await remote.toolExecute({
						call: {
							type: 'toolCall',
							id: 'call-1',
							name: 'echo',
							arguments: { text: 'hello' },
						},
					});
					yield {
						type: 'update',
						messageId: 'message-1',
						message: {
							role: 'assistant',
							content: result.content,
						},
					};
					yield { type: 'turnEnd', stopCode: StopCode.Finished };
				},
				cancel: vi.fn(async () => {}),
			});
			return clientSide;
		});
		const toolExecute = vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: String(call.arguments.text) }],
		}));

		const client = await connect({ toolExecute });
		const events = await collect(
			client.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'run tool' }],
			}),
		);

		expect(toolExecute).toHaveBeenCalledWith({
			call: {
				type: 'toolCall',
				id: 'call-1',
				name: 'echo',
				arguments: { text: 'hello' },
			},
		});
		expect(events).toEqual([
			{
				type: 'update',
				messageId: 'message-1',
				message: {
					role: 'assistant',
					content: [{ type: 'text', text: 'hello' }],
				},
			},
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);

		await client.dispose();
	});

	it('disposes the bound transport', async () => {
		const { spawn, dispose } = createTransportFactory({
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(async function* () {}),
			cancel: vi.fn(async () => {}),
		});
		const connect = createMiniACPRpcConnector(spawn);
		const client = await connect({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [],
			})),
		});

		await client.dispose();

		expect(dispose).toHaveBeenCalledOnce();
	});
});
