import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
	AnyMessage,
	ContentBlock,
	McpServer,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { AGENT_METHODS, CLIENT_METHODS } from '@agentclientprotocol/sdk';

import type { McpToolStream } from '@franklin/local-mcp';

import type { AgentTransport } from '../../transport/index.js';
import { compileExtension, compileExtensions } from '../compile/index.js';
import type { McpTransportFactory } from '../compile/index.js';
import { ConversationExtension } from '../core/conversation/index.js';
import type { UserEntry } from '../core/conversation/types.js';
import { TodoExtension } from '../core/todo/index.js';
import type { Extension } from '../types/index.js';
import {
	createMockTransportFactory,
	createTransportPair,
	sendCommand,
	stubMcpConfig,
} from './helpers.js';

// Shared tool schema for tests
const emptyObjectSchema = z.object({});

// ---------------------------------------------------------------------------
// compileExtension
// ---------------------------------------------------------------------------

describe('compileExtension', () => {
	describe('compilation', () => {
		it('produces identity middleware when no hooks or tools registered', async () => {
			const ext: Extension = {
				name: 'empty',
				async setup() {},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

			expect((msg as { params: { cwd: string } }).params.cwd).toBe('/test');
			expect(
				(msg as { params: { mcpServers: unknown[] } }).params.mcpServers,
			).toEqual([]);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/original',
				mcpServers: [],
			});

			expect((msg as { params: { cwd: string } }).params.cwd).toBe('/modified');
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

			expect(
				(msg as { params: { mcpServers: McpServer[] } }).params.mcpServers,
			).toEqual([extraServer]);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

			const params = (msg as { params: { cwd: string; mcpServers: [] } })
				.params;
			expect(params.cwd).toBe('/test');
			expect(params.mcpServers).toEqual([]);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/original',
				mcpServers: [],
			});

			expect((msg as { params: { cwd: string } }).params.cwd).toBe(
				'/first/second',
			);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			await sendCommand(app, agent, AGENT_METHODS.session_load, {
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			const prompt = (msg as { params: { prompt: ContentBlock[] } }).params
				.prompt;
			expect(prompt).toHaveLength(2);
			expect((prompt[0] as { text: string }).text).toBe('[PREFIX]');
			expect((prompt[1] as { text: string }).text).toBe('hello');
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'original' }],
			});

			const prompt = (msg as { params: { prompt: ContentBlock[] } }).params
				.prompt;
			expect(prompt).toHaveLength(1);
			expect((prompt[0] as { text: string }).text).toBe('original');
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'X' }],
			});

			const texts = (
				msg as { params: { prompt: ContentBlock[] } }
			).params.prompt.map((b: ContentBlock) => (b as { text: string }).text);
			expect(texts).toEqual(['A', 'X', 'B']);
		});
	});

	describe('sessionUpdate notify', () => {
		it('fires handlers and forwards the notification', async () => {
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const notification: SessionNotification = {
				sessionId: 'test',
				update: {
					sessionUpdate: 'agent_message_chunk',
					content: { type: 'text', text: 'hi' },
				},
			};

			// Start reading from the app side
			const appReader = app.readable.getReader();
			const readPromise = appReader.read();

			// Agent sends the notification
			const agentWriter = agent.writable.getWriter();
			await agentWriter.write({
				jsonrpc: '2.0',
				method: CLIENT_METHODS.session_update,
				params: notification,
			} as AnyMessage);
			agentWriter.releaseLock();

			const { value: forwarded } = await readPromise;
			appReader.releaseLock();

			// Handler was called
			expect(received).toHaveLength(1);
			expect(received[0]).toEqual(notification);

			// Message was forwarded
			expect((forwarded as { method: string }).method).toBe(
				CLIENT_METHODS.session_update,
			);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

			expect(
				(msg as { params: { mcpServers: unknown[] } }).params.mcpServers,
			).toHaveLength(1);
		});

		it('passes extension name to transport factory', async () => {
			const receivedNames: string[] = [];
			const ext: Extension = {
				name: 'my-extension',
				async setup(api) {
					api.registerTool({
						name: 'my_tool',
						description: 'A test tool',
						schema: emptyObjectSchema,
						execute: async () => ({ ok: true }),
					});
				},
			};
			const factory: McpTransportFactory = async (extensionName) => {
				receivedNames.push(extensionName);
				const mockStream = {
					readable: new ReadableStream<never>(),
					writable: new WritableStream<never>(),
					close: async () => {},
				} as unknown as McpToolStream;
				return {
					config: stubMcpConfig,
					stream: mockStream,
					dispose: async () => {},
				};
			};
			await compileExtension(ext, factory);

			expect(receivedNames).toEqual(['my-extension']);
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

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_new, {
				cwd: '/test',
				mcpServers: [],
			});

			const mcpServers = (msg as { params: { mcpServers: McpServer[] } }).params
				.mcpServers;
			// Handler's server first, then tool server
			expect(mcpServers).toHaveLength(2);
			expect(mcpServers[0]).toBe(extraServer);
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

	describe('composition', () => {
		it('multiple extensions compose correctly via function application', async () => {
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

			// Compose: ext1 inner (closer to agent), ext2 outer
			const composed = (t: AgentTransport) => mw2(mw1(t));

			const { a: agent, b: inner } = createTransportPair();
			const app = composed(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'X' }],
			});

			const texts = (
				msg as { params: { prompt: ContentBlock[] } }
			).params.prompt.map((b: ContentBlock) => (b as { text: string }).text);
			// ext2 (outer) transforms first on writable, then ext1 (inner)
			// ext2 appends 'ext2', ext1 prepends 'ext1'
			// Command flow: app → ext2 → ext1 → agent
			expect(texts).toEqual(['ext1', 'X', 'ext2']);
		});
	});

	describe('disposal', () => {
		it('close cleans up transport', async () => {
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

			const { b: inner } = createTransportPair();
			const app = middleware(inner);

			await app.close();

			expect(getTransport()!.dispose).toHaveBeenCalled();
		});

		it('close is safe when no transport was created', async () => {
			const ext: Extension = {
				name: 'no-tools',
				async setup() {},
			};
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			// Identity middleware — transport is returned as-is
			const { b: inner } = createTransportPair();
			const app = middleware(inner);

			// Should not throw
			await app.close();
		});

		it('composed close cascades through layers', async () => {
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

			const factory1: McpTransportFactory = async (_name) => ({
				config: stubMcpConfig,
				stream: mockStream(),
				dispose: async () => {
					disposeLog.push('ext1');
				},
			});
			const factory2: McpTransportFactory = async (_name) => ({
				config: stubMcpConfig,
				stream: mockStream(),
				dispose: async () => {
					disposeLog.push('ext2');
				},
			});

			const mw1 = await compileExtension(ext1, factory1);
			const mw2 = await compileExtension(ext2, factory2);

			const { b: inner } = createTransportPair();
			// ext1 inner, ext2 outer: mw2(mw1(inner))
			const app = mw2(mw1(inner));

			await app.close();

			// ext2 (outer) closes first, then ext1 (inner)
			expect(disposeLog).toEqual(['ext2', 'ext1']);
		});
	});

	describe('multi-extension prompt isolation', () => {
		it('conversation records the raw user prompt, not todo-modified prompt', async () => {
			const conversation = new ConversationExtension();
			const todo = new TodoExtension();

			// Pre-populate a todo so the prompt handler will prepend <todos>
			todo.state.set((draft) => {
				draft.push({
					id: 'todo-1',
					text: 'Buy milk',
					completed: false,
					createdAt: Date.now(),
				});
			});

			const { factory } = createMockTransportFactory();
			const middleware = await compileExtensions([conversation, todo], factory);

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			// Send a prompt through the composed middleware
			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			// Agent should receive the todo-modified prompt (with <todos> prepended)
			const agentPrompt = (msg as { params: { prompt: ContentBlock[] } }).params
				.prompt;
			expect(agentPrompt).toHaveLength(2);
			expect((agentPrompt[0] as { text: string }).text).toContain('<todos>');
			expect((agentPrompt[1] as { text: string }).text).toBe('hello');

			// But conversation state should record the RAW user prompt, not the modified one
			const turns = conversation.state.get();
			expect(turns).toHaveLength(1);

			const userEntry = turns[0]!.entries[0] as UserEntry;
			expect(userEntry.type).toBe('user');
			expect(userEntry.content).toHaveLength(1);
			expect((userEntry.content[0] as { text: string }).text).toBe('hello');
		});

		it('first extension in array is closer to app (observes raw prompt)', async () => {
			const log: string[] = [];

			const observer: Extension = {
				name: 'observer',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						log.push(`observer:${(ctx.prompt[0] as { text: string }).text}`);
						return undefined;
					});
				},
			};

			const transformer: Extension = {
				name: 'transformer',
				async setup(api) {
					api.on('prompt', async (ctx) => {
						log.push(`transformer:${(ctx.prompt[0] as { text: string }).text}`);
						return {
							prompt: [
								{ type: 'text' as const, text: '[WRAPPED]' },
								...ctx.prompt,
							],
						};
					});
				},
			};

			const { factory } = createMockTransportFactory();
			// observer listed first — should see raw prompt
			const middleware = await compileExtensions(
				[observer, transformer],
				factory,
			);

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			// observer should see raw 'hello', transformer should see raw 'hello'
			// (observer doesn't modify, so transformer also sees 'hello')
			expect(log).toEqual(['observer:hello', 'transformer:hello']);
		});
	});
});
