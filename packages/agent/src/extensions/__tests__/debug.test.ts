import { describe, expect, it, vi } from 'vitest';

import type {
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	SessionNotification,
} from '@agentclientprotocol/sdk';

import { joinCommands, joinEvents } from '../../middleware/join.js';
import type { AgentCommands, AgentEvents } from '../../types.js';
import { createDebugMiddleware } from '../examples/debug/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTerminalCommands(
	overrides?: Partial<AgentCommands>,
): AgentCommands {
	const noop = () => Promise.resolve({}) as Promise<never>;
	return {
		initialize: noop,
		newSession: async (_params: NewSessionRequest) =>
			({ sessionId: 'test' }) as NewSessionResponse,
		loadSession: noop,
		listSessions: noop,
		prompt: async () => ({ stopReason: 'end_turn' as const }),
		cancel: async () => {},
		setSessionMode: noop,
		setSessionConfigOption: noop,
		authenticate: noop,
		...overrides,
	};
}

function createTerminalEvents(overrides?: Partial<AgentEvents>): AgentEvents {
	const noop = () => Promise.resolve({}) as Promise<never>;
	return {
		sessionUpdate: async () => {},
		requestPermission: noop,
		readTextFile: noop,
		writeTextFile: noop,
		createTerminal: noop,
		terminalOutput: noop,
		releaseTerminal: noop,
		waitForTerminalExit: noop,
		killTerminal: noop,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createDebugMiddleware', () => {
	it('logs commands (app → agent) and their responses', async () => {
		const logs: string[] = [];
		const mw = createDebugMiddleware({
			log: (label, direction, method, _params) => {
				logs.push(`${label} ${direction} ${method}`);
			},
		});

		const terminal = createTerminalCommands();
		const commands = joinCommands(mw, terminal);

		await commands.newSession({ cwd: '/test', mcpServers: [] });

		expect(logs).toEqual(['debug → newSession', 'debug ← newSession:response']);
	});

	it('logs events (agent → app) and their responses', async () => {
		const logs: string[] = [];
		const mw = createDebugMiddleware({
			log: (label, direction, method, _params) => {
				logs.push(`${label} ${direction} ${method}`);
			},
		});

		const terminal = createTerminalEvents();
		const events = joinEvents(mw, terminal);

		const notification: SessionNotification = {
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hello' },
			},
		};
		await events.sessionUpdate(notification);

		expect(logs).toEqual([
			'debug ← sessionUpdate',
			'debug → sessionUpdate:response',
		]);
	});

	it('logs requestPermission events with responses', async () => {
		const logs: string[] = [];
		const mw = createDebugMiddleware({
			log: (label, direction, method, _params) => {
				logs.push(`${label} ${direction} ${method}`);
			},
		});

		const terminal = createTerminalEvents({
			requestPermission: async () => ({ outcome: 'allowed' }) as never,
		});
		const events = joinEvents(mw, terminal);

		await events.requestPermission({
			sessionId: 'test',
			tool: 'bash',
			command: 'ls',
			options: [],
			toolCall: {},
		} as never);

		expect(logs).toEqual([
			'debug ← requestPermission',
			'debug → requestPermission:response',
		]);
	});

	it('forwards params unchanged', async () => {
		const mw = createDebugMiddleware();

		const captured: PromptRequest[] = [];
		const terminal = createTerminalCommands({
			prompt: async (p) => {
				captured.push(p);
				return { stopReason: 'end_turn' as const };
			},
		});

		const commands = joinCommands(mw, terminal);
		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(captured).toHaveLength(1);
		expect(captured[0]!.prompt).toEqual([{ type: 'text', text: 'hello' }]);
	});

	it('supports custom label', async () => {
		const logs: string[] = [];
		const mw = createDebugMiddleware({
			label: 'my-layer',
			log: (label, direction, method, _params) => {
				logs.push(`${label} ${direction} ${method}`);
			},
		});

		const terminal = createTerminalCommands();
		const commands = joinCommands(mw, terminal);
		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hi' }],
		});

		expect(logs[0]).toMatch(/^my-layer/);
	});

	it('default log includes params summary', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const mw = createDebugMiddleware({ label: 'test' });
		const terminal = createTerminalCommands();
		const commands = joinCommands(mw, terminal);
		await commands.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hi' }],
		});

		expect(consoleSpy).toHaveBeenCalled();
		const firstCall = consoleSpy.mock.calls[0]![0] as string;
		expect(firstCall).toContain('[test]');
		expect(firstCall).toContain('prompt');
		expect(firstCall).toContain('hi');

		consoleSpy.mockRestore();
	});

	it('dispose logs a message', async () => {
		const logs: string[] = [];
		const mw = createDebugMiddleware({
			log: (label, direction, method, _params) => {
				logs.push(`${label} ${direction} ${method}`);
			},
		});

		await mw.dispose!();

		expect(logs).toEqual(['debug • dispose']);
	});
});
