import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import { describe, expect, it, vi } from 'vitest';
import { collectEvents } from '../../__tests__/utils/collect-events.js';
import { ZERO_USAGE } from '../../protocol/usage-tracker.js';
import { StopCode } from '../../types/index.js';
import type { ToolExecuteParams } from '../../types/index.js';
import { bindMiniACPRpcAgent, createMiniACPRpcConnector } from '../index.js';
import type { MuClient } from '../../protocol/types.js';
import type { MiniACPRpcProtocol } from '../types.js';

function createTransportFactory(agent: MuClient) {
	const dispose = vi.fn(async () => {});

	return {
		spawn: (): MiniACPRpcProtocol => {
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
			continue: vi.fn(async function* () {}),
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
					yield {
						type: 'turnEnd',
						stepUsage: ZERO_USAGE,
						usage: ZERO_USAGE,
						stopCode: StopCode.Finished,
					};
				},
				continue: vi.fn(async function* () {}),
				cancel: vi.fn(async () => {}),
			});
			return clientSide;
		});
		const toolExecute = vi.fn(async ({ call }: ToolExecuteParams) => {
			const text = call.arguments.text;
			if (typeof text !== 'string') {
				throw new Error('expected string text argument');
			}
			return {
				toolCallId: call.id,
				content: [{ type: 'text' as const, text }],
			};
		});

		const client = await connect({ toolExecute });
		const events = await collectEvents(
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
			{
				type: 'turnEnd',
				stepUsage: ZERO_USAGE,
				usage: ZERO_USAGE,
				stopCode: StopCode.Finished,
			},
		]);

		await client.dispose();
	});

	it('disposes the bound transport', async () => {
		const { spawn, dispose } = createTransportFactory({
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(async function* () {}),
			continue: vi.fn(async function* () {}),
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
