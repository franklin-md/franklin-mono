import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StopCode } from '../types/stop-code.js';
import type { ToolExecuteParams } from '../types/tool.js';

const adapterInputs = vi.hoisted(
	(): Array<{ context: unknown; server: unknown; streamFn: unknown }> => [],
);
const createPiAdapterMock = vi.hoisted(() => vi.fn());

vi.mock('../base/pi/adapter.js', () => ({
	createPiAdapter: createPiAdapterMock,
}));

import { createPiAgent } from '../base/pi/agent.js';

describe('createPiAgent', () => {
	beforeEach(() => {
		adapterInputs.length = 0;
		createPiAdapterMock.mockReset();
		createPiAdapterMock.mockImplementation(
			(options: {
				context: unknown;
				server: {
					toolExecute(params: {
						call: {
							type: 'toolCall';
							id: string;
							name: string;
							arguments: Record<string, unknown>;
						};
					}): Promise<unknown>;
				};
				streamFn?: unknown;
			}) => {
				adapterInputs.push({
					context: structuredClone(options.context),
					server: options.server,
					streamFn: options.streamFn,
				});
				return {
					async *prompt() {
						yield { type: 'turnStart' };
						await options.server.toolExecute({
							call: {
								type: 'toolCall',
								id: 'tool-1',
								name: 'echo',
								arguments: { value: 'hello' },
							},
						});
						yield { type: 'turnEnd', stopCode: StopCode.Finished };
					},
					cancel: vi.fn(async () => {}),
				};
			},
		);
	});

	it('returns a Mini-ACP client', () => {
		const client = createPiAgent({
			toolExecute: vi.fn(async (_params: ToolExecuteParams) => ({
				toolCallId: 'tool-1',
				content: [],
			})),
		});

		expect(client.initialize).toEqual(expect.any(Function));
		expect(client.setContext).toEqual(expect.any(Function));
		expect(client.prompt).toEqual(expect.any(Function));
		expect(client.cancel).toEqual(expect.any(Function));
	});

	it('creates Pi turn clients with the current context and options', async () => {
		const streamFn = vi.fn();
		const server = {
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'ok' }],
			})),
		};
		const client = createPiAgent(server, { streamFn });
		const tool = {
			name: 'echo',
			description: 'Echo input',
			inputSchema: { type: 'object' },
		};

		await client.initialize();
		await client.setContext({
			systemPrompt: 'system prompt',
			messages: [],
			tools: [tool],
			config: { model: 'gpt-5.4' },
		});

		const events: unknown[] = [];
		for await (const event of client.prompt({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		})) {
			events.push(event);
		}

		expect(createPiAdapterMock).toHaveBeenCalledOnce();
		expect(adapterInputs).toEqual([
			{
				context: {
					systemPrompt: 'system prompt',
					messages: [],
					tools: [tool],
					config: { model: 'gpt-5.4' },
				},
				server: expect.any(Object),
				streamFn,
			},
		]);
		expect(server.toolExecute).toHaveBeenCalledWith({
			call: {
				type: 'toolCall',
				id: 'tool-1',
				name: 'echo',
				arguments: { value: 'hello' },
			},
		});
		expect(events).toEqual([
			{ type: 'turnStart' },
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);
	});
});
