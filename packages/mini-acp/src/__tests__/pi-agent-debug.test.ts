import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import { describe, expect, it, vi } from 'vitest';

import { bindDebugPiAgent } from '../protocol/debug.js';
import { createClientConnection } from '../protocol/connection.js';
import { debugBinding } from '../protocol/debug.js';
import type { AgentProtocol, ClientProtocol } from '../protocol/types.js';
import type { ToolExecuteParams } from '../types/tool.js';

const ANSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function stripAnsi(value: string | undefined): string | undefined {
	return typeof value === 'string' ? value.replace(ANSI_REGEX, '') : undefined;
}

describe('debugBinding', () => {
	it('logs Mini-ACP protocol events when wrapping bindDebugPiAgent', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const { a, b } = createDuplexPair<JsonRpcMessage>();

		debugBinding(bindDebugPiAgent, b as AgentProtocol);

		const connection = createClientConnection(a as ClientProtocol);
		connection.bind({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'unused' }],
			})),
		});

		await connection.remote.initialize();
		await connection.remote.setContext({
			history: { systemPrompt: 'test', messages: [] },
			tools: [],
		});

		const firstCall = spy.mock.calls[0];
		const secondCall = spy.mock.calls[1];
		const first =
			typeof firstCall?.[0] === 'string' ? stripAnsi(firstCall[0]) : undefined;
		const second =
			typeof secondCall?.[0] === 'string'
				? stripAnsi(secondCall[0])
				: undefined;
		const firstLabel =
			typeof first === 'string'
				? /^\[(agent-\d+)\]/.exec(first)?.[1]
				: undefined;
		const secondLabel =
			typeof second === 'string'
				? /^\[(agent-\d+)\]/.exec(second)?.[1]
				: undefined;

		expect(first).toMatch(/^\[agent-\d+\] initialize$/);
		expect(second).toMatch(
			/^\[agent-\d+\] setContext systemPrompt messages=0 tools=0$/,
		);
		expect(firstLabel).toBe(secondLabel);

		spy.mockRestore();
	});

	it('increments the generated label for each binding', () => {
		const labels: string[] = [];
		const bind = vi.fn((_transport: { id: number }, debugLabel?: string) => {
			if (typeof debugLabel === 'string') labels.push(debugLabel);
		});

		debugBinding(bind, { id: 1 });
		debugBinding(bind, { id: 2 });

		expect(labels).toHaveLength(2);
		expect(labels[0]).toMatch(/^agent-\d+$/);
		expect(labels[1]).toMatch(/^agent-\d+$/);

		const first = Number(labels[0]?.split('-')[1]);
		const second = Number(labels[1]?.split('-')[1]);
		expect(second).toBe(first + 1);
	});
});
