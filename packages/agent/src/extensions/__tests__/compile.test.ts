import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
	ContentBlock,
	McpServer,
	NewSessionRequest,
	NewSessionResponse,
	LoadSessionRequest,
	LoadSessionResponse,
	PromptRequest,
	SessionNotification,
} from '@agentclientprotocol/sdk';

import type { McpTransport, McpToolStream } from '@franklin/local-mcp';

import { joinCommands, joinEvents } from '../../middleware/join.js';
import { sequence } from '../../middleware/sequence.js';
import type { AgentCommands, AgentEvents } from '../../types.js';
import { compileExtension } from '../compile/index.js';
import type { McpTransportFactory } from '../compile/index.js';
import type { Extension } from '../types/index.js';

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
		loadSession: async (params: LoadSessionRequest) =>
			({ sessionId: params.sessionId }) as unknown as LoadSessionResponse,
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

const stubMcpConfig = {
	command: 'node',
	args: ['--version'],
	env: { STUB: 'true' },
};

function createMockTransportFactory(): {
	factory: McpTransportFactory;
	getTransport: () => McpTransport | undefined;
} {
	let transport: McpTransport | undefined;
	const factory: McpTransportFactory = async () => {
		const mockStream = {
			readable: new ReadableStream<never>(),
			writable: new WritableStream<never>(),
			close: async () => {},
		} as unknown as McpToolStream;

		transport = {
			config: stubMcpConfig,
			stream: mockStream,
			dispose: vi.fn(async () => {}),
		};
		return transport;
	};
	return { factory, getTransport: () => transport };
}

// Shared tool schema for tests
const emptyObjectSchema = z.object({});

// ---------------------------------------------------------------------------
// compileExtension
// ---------------------------------------------------------------------------

describe('compileExtension', () => {
	describe('compilation', () => {
		it('produces passthrough middleware when no hooks or tools registered', async () => {
			const ext: Extension = {
				name: 'empty',
				async setup() {},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			expect(captured).toHaveLength(1);
			expect(captured[0]!.cwd).toBe('/test');
			expect(captured[0]!.mcpServers).toEqual([]);
		});

		it('supports async setup', async () => {
			const log: string[] = [];
			const ext: Extension = {
				name: 'async-setup',
				async setup(api) {
					await Promise.resolve();
					api.on('prompt', async (ctx) => {
						log.push('prompt');
						return { prompt: ctx.prompt };
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const terminal = createTerminalCommands();
			const commands = joinCommands(middleware, terminal);
			await commands.prompt({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			expect(log).toEqual(['prompt']);
		});
	});

	describe('sessionStart waterfall', () => {
		it('handler can modify cwd', async () => {
			const ext: Extension = {
				name: 'cwd-modifier',
				async setup(api) {
					api.on('sessionStart', async () => {
						return { cwd: '/modified' };
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/original', mcpServers: [] });

			expect(captured[0]!.cwd).toBe('/modified');
		});

		it('handler can modify mcpServers', async () => {
			const extraServer: McpServer = {
				name: 'extra',
				command: 'extra-cmd',
				args: [],
				env: [],
			};
			const ext: Extension = {
				name: 'mcp-injector',
				async setup(api) {
					api.on('sessionStart', async (ctx) => {
						return {
							mcpServers: [...ctx.mcpServers, extraServer],
						};
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			expect(captured[0]!.mcpServers).toEqual([extraServer]);
		});

		it('undefined return passes through unchanged', async () => {
			const ext: Extension = {
				name: 'observer',
				async setup(api) {
					api.on('sessionStart', async () => {
						return undefined;
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			expect(captured[0]!.cwd).toBe('/test');
			expect(captured[0]!.mcpServers).toEqual([]);
		});

		it('multiple handlers chain in registration order', async () => {
			const ext: Extension = {
				name: 'chained',
				async setup(api) {
					api.on('sessionStart', async () => {
						return { cwd: '/first' };
					});
					api.on('sessionStart', async (ctx) => {
						return { cwd: ctx.cwd + '/second' };
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/original', mcpServers: [] });

			expect(captured[0]!.cwd).toBe('/first/second');
		});

		it('fires on loadSession with sessionId', async () => {
			const receivedCtx: { sessionId?: string }[] = [];
			const ext: Extension = {
				name: 'load-observer',
				async setup(api) {
					api.on('sessionStart', async (ctx) => {
						receivedCtx.push({ sessionId: ctx.sessionId });
						return undefined;
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const terminal = createTerminalCommands();
			const commands = joinCommands(middleware, terminal);
			await commands.loadSession({
				sessionId: 'existing-session',
				cwd: '/test',
				mcpServers: [],
			});

			expect(receivedCtx[0]!.sessionId).toBe('existing-session');
		});

		it('fires on newSession with undefined sessionId', async () => {
			const receivedCtx: { sessionId?: string }[] = [];
			const ext: Extension = {
				name: 'new-observer',
				async setup(api) {
					api.on('sessionStart', async (ctx) => {
						receivedCtx.push({ sessionId: ctx.sessionId });
						return undefined;
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const terminal = createTerminalCommands();
			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			expect(receivedCtx[0]!.sessionId).toBeUndefined();
		});
	});

	describe('prompt waterfall', () => {
		it('transforms prompt content', async () => {
			const ext: Extension = {
				name: 'prompt-transformer',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						return {
							prompt: [
								{ type: 'text' as const, text: '[PREFIX]' },
								...ctx.prompt,
							],
						};
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: PromptRequest[] = [];
			const terminal = createTerminalCommands({
				prompt: async (p) => {
					captured.push(p);
					return { stopReason: 'end_turn' as const };
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.prompt({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			expect(captured[0]!.prompt).toHaveLength(2);
			expect((captured[0]!.prompt[0] as { text: string }).text).toBe(
				'[PREFIX]',
			);
			expect((captured[0]!.prompt[1] as { text: string }).text).toBe('hello');
		});

		it('undefined return passes through unchanged', async () => {
			const ext: Extension = {
				name: 'prompt-observer',
				async setup(api) {
					api.on('prompt', async () => {
						return undefined;
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: PromptRequest[] = [];
			const terminal = createTerminalCommands({
				prompt: async (p) => {
					captured.push(p);
					return { stopReason: 'end_turn' as const };
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.prompt({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'original' }],
			});

			expect(captured[0]!.prompt).toHaveLength(1);
			expect((captured[0]!.prompt[0] as { text: string }).text).toBe(
				'original',
			);
		});

		it('multiple handlers chain as waterfall', async () => {
			const ext: Extension = {
				name: 'prompt-chain',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						return {
							prompt: [{ type: 'text' as const, text: 'A' }, ...ctx.prompt],
						};
					});
					api.on('prompt', async (ctx) => {
						return {
							prompt: [...ctx.prompt, { type: 'text' as const, text: 'B' }],
						};
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: PromptRequest[] = [];
			const terminal = createTerminalCommands({
				prompt: async (p) => {
					captured.push(p);
					return { stopReason: 'end_turn' as const };
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.prompt({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'X' }],
			});

			const texts = captured[0]!.prompt.map(
				(b: ContentBlock) => (b as { text: string }).text,
			);
			expect(texts).toEqual(['A', 'X', 'B']);
		});
	});

	describe('sessionUpdate notify', () => {
		it('fires handlers without modifying params', async () => {
			const received: SessionNotification[] = [];
			const ext: Extension = {
				name: 'update-observer',
				async setup(api) {
					api.on('sessionUpdate', async (ctx) => {
						received.push(ctx.notification);
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const terminalReceived: SessionNotification[] = [];
			const terminal = createTerminalEvents({
				sessionUpdate: async (p) => {
					terminalReceived.push(p);
				},
			});

			const events = joinEvents(middleware, terminal);
			const notification: SessionNotification = {
				sessionId: 'test',
				update: {
					sessionUpdate: 'agent_message_chunk',
					content: { type: 'text', text: 'hi' },
				},
			};
			await events.sessionUpdate(notification);

			expect(received).toHaveLength(1);
			expect(received[0]).toBe(notification);
			expect(terminalReceived).toHaveLength(1);
			expect(terminalReceived[0]).toBe(notification);
		});
	});

	describe('tool registration', () => {
		it('creates transport when tools are registered', async () => {
			const ext: Extension = {
				name: 'with-tools',
				async setup(api) {
					api.registerTool({
						name: 'my_tool',
						description: 'A test tool',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};
			const { factory, getTransport } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			expect(getTransport()).toBeDefined();

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			expect(captured[0]!.mcpServers).toHaveLength(1);
		});

		it('injects tool MCP server after sessionStart handler modifications', async () => {
			const extraServer: McpServer = {
				name: 'extra',
				command: 'extra-cmd',
				args: [],
				env: [],
			};
			const ext: Extension = {
				name: 'tools-and-hooks',
				async setup(api) {
					api.on('sessionStart', async (ctx) => {
						return {
							mcpServers: [...ctx.mcpServers, extraServer],
						};
					});
					api.registerTool({
						name: 'my_tool',
						description: 'A test tool',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const captured: NewSessionRequest[] = [];
			const terminal = createTerminalCommands({
				newSession: async (p) => {
					captured.push(p);
					return { sessionId: 'test' } as NewSessionResponse;
				},
			});

			const commands = joinCommands(middleware, terminal);
			await commands.newSession({ cwd: '/test', mcpServers: [] });

			// Handler's server first, then tool server
			expect(captured[0]!.mcpServers).toHaveLength(2);
			expect(captured[0]!.mcpServers[0]).toBe(extraServer);
		});
	});

	describe('no tools', () => {
		it('does not create transport when no tools registered', async () => {
			const ext: Extension = {
				name: 'no-tools',
				async setup(api) {
					api.on('prompt', async () => undefined);
				},
			};
			const { factory, getTransport } = createMockTransportFactory();
			await compileExtension(ext, factory);

			expect(getTransport()).toBeUndefined();
		});
	});

	describe('composition via sequence()', () => {
		it('multiple extensions compose correctly', async () => {
			const ext1: Extension = {
				name: 'ext1',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						return {
							prompt: [{ type: 'text' as const, text: 'ext1' }, ...ctx.prompt],
						};
					});
				},
			};
			const ext2: Extension = {
				name: 'ext2',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						return {
							prompt: [...ctx.prompt, { type: 'text' as const, text: 'ext2' }],
						};
					});
				},
			};

			const { factory } = createMockTransportFactory();
			const mw1 = await compileExtension(ext1, factory);
			const mw2 = await compileExtension(ext2, factory);

			const composed = sequence(mw1, mw2);

			const captured: PromptRequest[] = [];
			const terminal = createTerminalCommands({
				prompt: async (p) => {
					captured.push(p);
					return { stopReason: 'end_turn' as const };
				},
			});

			const commands = joinCommands(composed, terminal);
			await commands.prompt({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'X' }],
			});

			const texts = captured[0]!.prompt.map(
				(b: ContentBlock) => (b as { text: string }).text,
			);
			expect(texts).toEqual(['ext1', 'X', 'ext2']);
		});
	});

	describe('disposal', () => {
		it('dispose cleans up transport', async () => {
			const ext: Extension = {
				name: 'disposable',
				async setup(api) {
					api.registerTool({
						name: 'tool',
						description: 'test',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};
			const { factory, getTransport } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			await middleware.dispose!();

			expect(getTransport()!.dispose).toHaveBeenCalled();
		});

		it('dispose is safe when no transport was created', async () => {
			const ext: Extension = {
				name: 'no-tools',
				async setup() {},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			// Should not throw
			await middleware.dispose?.();
		});

		it('sequence chains dispose calls', async () => {
			const disposeLog: string[] = [];
			const ext1: Extension = {
				name: 'ext1',
				async setup(api) {
					api.registerTool({
						name: 't1',
						description: 'test',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};
			const ext2: Extension = {
				name: 'ext2',
				async setup(api) {
					api.registerTool({
						name: 't2',
						description: 'test',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};

			const mockStream = () =>
				({
					readable: new ReadableStream<never>(),
					writable: new WritableStream<never>(),
					close: async () => {},
				}) as unknown as McpToolStream;

			const factory1: McpTransportFactory = async () => ({
				config: stubMcpConfig,
				stream: mockStream(),
				dispose: async () => {
					disposeLog.push('ext1');
				},
			});
			const factory2: McpTransportFactory = async () => ({
				config: stubMcpConfig,
				stream: mockStream(),
				dispose: async () => {
					disposeLog.push('ext2');
				},
			});

			const mw1 = await compileExtension(ext1, factory1);
			const mw2 = await compileExtension(ext2, factory2);
			const composed = sequence(mw1, mw2);

			await composed.dispose!();

			expect(disposeLog).toEqual(['ext1', 'ext2']);
		});
	});
});
