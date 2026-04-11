import { describe, expect, it, vi } from 'vitest';

import { debugMiniACP } from '../protocol/debug.js';
import type { MuAgent, MuClient } from '../protocol/types.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteParams } from '../types/tool.js';
import { StopCode } from '../types/stop-code.js';

const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_BLUE = '\x1b[34m';
const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_RESET = '\x1b[0m';

async function drain(iter: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const out: StreamEvent[] = [];
	for await (const event of iter) out.push(event);
	return out;
}

function mockClient(events: StreamEvent[] = []): MuClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		cancel: vi.fn(async () => {}),
		async *prompt(): AsyncGenerator<StreamEvent> {
			for (const event of events) yield event;
		},
	};
}

function mockAgent(): MuAgent {
	return {
		toolExecute: vi.fn(async (params: ToolExecuteParams) => ({
			toolCallId: params.call.id,
			content: [{ type: 'text' as const, text: 'result' }],
		})),
	};
}

describe('debugMiniACP', () => {
	it('decorates MuClient methods without changing behavior', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const inner = mockClient([
			{ type: 'turnStart' },
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);
		const debugged = debugMiniACP(inner, 'mini');

		await debugged.initialize();
		await debugged.setContext({
			history: { systemPrompt: 'test', messages: [] },
			tools: [],
		});
		const events = await drain(
			debugged.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);
		await debugged.cancel();

		expect(inner.initialize).toHaveBeenCalledOnce();
		expect(inner.setContext).toHaveBeenCalledOnce();
		expect(inner.cancel).toHaveBeenCalledOnce();
		expect(events).toEqual([
			{ type: 'turnStart' },
			{ type: 'turnEnd', stopCode: StopCode.Finished },
		]);

		expect(spy.mock.calls).toEqual([
			[`[mini] ${ANSI_BOLD}initialize${ANSI_RESET}`],
			[
				`[mini] ${ANSI_BOLD}setContext${ANSI_RESET} systemPrompt messages=0 tools=0`,
			],
			[`[mini] ${ANSI_BOLD}prompt${ANSI_RESET}`],
			[`[mini]   ${ANSI_BOLD}user${ANSI_RESET}`],
			[`[mini]     ${ANSI_BOLD}message${ANSI_RESET} hello`],
			[`[mini]   ${ANSI_BOLD}assistant${ANSI_RESET}`],
			[`[mini]     ${ANSI_BOLD}turnStart${ANSI_RESET}`],
			[
				`[mini]     ${ANSI_BOLD}turnEnd${ANSI_RESET} ${ANSI_GREEN}Finished (1000)${ANSI_RESET}`,
			],
			[`[mini] ${ANSI_BOLD}cancel${ANSI_RESET}`],
		]);

		spy.mockRestore();
	});

	it('suppresses chunk events and logs formatted updates', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const inner = mockClient([
			{ type: 'turnStart' },
			{
				type: 'chunk',
				messageId: 'm1',
				role: 'assistant',
				content: { type: 'text', text: 'partial' },
			},
			{
				type: 'update',
				messageId: 'm1',
				message: {
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Hello world' },
						{ type: 'thinking', text: 'reasoning trace' },
					],
				},
			},
			{
				type: 'turnEnd',
				stopCode: StopCode.ProviderError,
				stopMessage: 'provider exploded',
			},
		]);
		const debugged = debugMiniACP(inner, 'mini');

		const yielded = await drain(
			debugged.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(yielded).toHaveLength(4);
		expect(spy.mock.calls).toEqual([
			[`[mini] ${ANSI_BOLD}prompt${ANSI_RESET}`],
			[`[mini]   ${ANSI_BOLD}user${ANSI_RESET}`],
			[`[mini]     ${ANSI_BOLD}message${ANSI_RESET} hi`],
			[`[mini]   ${ANSI_BOLD}assistant${ANSI_RESET}`],
			[`[mini]     ${ANSI_BOLD}turnStart${ANSI_RESET}`],
			[
				`[mini]     ${ANSI_BOLD}reasoning${ANSI_RESET} ${ANSI_DIM}reasoning trace${ANSI_RESET}`,
			],
			[`[mini]     ${ANSI_BOLD}message${ANSI_RESET} Hello world`],
			[
				`[mini]     ${ANSI_BOLD}turnEnd${ANSI_RESET} ${ANSI_RED}ProviderError (2200)${ANSI_RESET}: provider exploded`,
			],
		]);

		spy.mockRestore();
	});

	it('decorates MuAgent tool execution and preserves results', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const inner = mockAgent();
		const debugged = debugMiniACP(inner, 'mini');

		const result = await debugged.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-1',
				name: 'lookup_capital',
				arguments: { country: 'France' },
			},
		});

		expect(result).toEqual({
			toolCallId: 'call-1',
			content: [{ type: 'text', text: 'result' }],
		});
		expect(spy.mock.calls).toEqual([
			[
				`[mini]     ${ANSI_YELLOW}${ANSI_BOLD}toolExecute${ANSI_RESET}${ANSI_YELLOW} lookup_capital {"country":"France"}${ANSI_RESET}`,
			],
			[
				`[mini]     ${ANSI_CYAN}${ANSI_BOLD}toolResult${ANSI_RESET}${ANSI_CYAN} lookup_capital result${ANSI_RESET}`,
			],
		]);

		spy.mockRestore();
	});

	it('logs in-band tool errors in red', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const inner: MuAgent = {
			toolExecute: vi.fn(async (params: ToolExecuteParams) => ({
				toolCallId: params.call.id,
				isError: true,
				content: [{ type: 'text' as const, text: 'permission denied' }],
			})),
		};
		const debugged = debugMiniACP(inner, 'mini');

		await debugged.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-2',
				name: 'write_file',
				arguments: { path: 'a.ts' },
			},
		});

		expect(spy.mock.calls).toEqual([
			[
				`[mini]     ${ANSI_YELLOW}${ANSI_BOLD}toolExecute${ANSI_RESET}${ANSI_YELLOW} write_file {"path":"a.ts"}${ANSI_RESET}`,
			],
			[
				`[mini]     ${ANSI_RED}${ANSI_BOLD}toolError${ANSI_RESET}${ANSI_RED} write_file permission denied${ANSI_RESET}`,
			],
		]);

		spy.mockRestore();
	});

	it('logs thrown tool execution errors and rethrows', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const inner: MuAgent = {
			toolExecute: vi.fn(async () => {
				throw new Error('boom');
			}),
		};
		const debugged = debugMiniACP(inner, 'mini');

		await expect(
			debugged.toolExecute({
				call: {
					type: 'toolCall',
					id: 'call-3',
					name: 'explode',
					arguments: {},
				},
			}),
		).rejects.toThrow('boom');

		expect(spy.mock.calls).toEqual([
			[
				`[mini]     ${ANSI_YELLOW}${ANSI_BOLD}toolExecute${ANSI_RESET}${ANSI_YELLOW} explode {}${ANSI_RESET}`,
			],
			[
				`[mini]     ${ANSI_RED}${ANSI_BOLD}toolExecute explode error${ANSI_RESET}${ANSI_RED} boom${ANSI_RESET}`,
			],
		]);

		spy.mockRestore();
	});

	it('uses the default label', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const debugged = debugMiniACP(mockClient([{ type: 'turnStart' }]));

		await drain(
			debugged.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		expect(spy).toHaveBeenCalledWith(`[debug] ${ANSI_BOLD}prompt${ANSI_RESET}`);
		expect(spy).toHaveBeenCalledWith(`[debug]   ${ANSI_BOLD}user${ANSI_RESET}`);
		expect(spy).toHaveBeenCalledWith(
			`[debug]     ${ANSI_BOLD}message${ANSI_RESET} hello`,
		);
		expect(spy).toHaveBeenCalledWith(
			`[debug]   ${ANSI_BOLD}assistant${ANSI_RESET}`,
		);
		expect(spy).toHaveBeenCalledWith(
			`[debug]     ${ANSI_BOLD}turnStart${ANSI_RESET}`,
		);

		spy.mockRestore();
	});

	it('colors cancelled turnEnd in blue', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const debugged = debugMiniACP(
			mockClient([{ type: 'turnEnd', stopCode: StopCode.Cancelled }]),
			'mini',
		);

		await drain(
			debugged.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		expect(spy).toHaveBeenCalledWith(
			`[mini]     ${ANSI_BOLD}turnEnd${ANSI_RESET} ${ANSI_BLUE}Cancelled (1001)${ANSI_RESET}`,
		);

		spy.mockRestore();
	});
});
