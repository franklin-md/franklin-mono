import { describe, expect, it, vi } from 'vitest';

import type {
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	SessionNotification,
} from '@agentclientprotocol/sdk';

import type { McpToolStream, McpTransport } from '@franklin/local-mcp';

import { joinCommands, joinEvents } from '../../middleware/join.js';
import type { AgentCommands, AgentEvents } from '../../types.js';
import { compileExtension } from '../compile/index.js';
import type { McpTransportFactory } from '../compile/index.js';
import { ConversationExtension } from '../examples/conversation/index.js';
import type {
	AgentTextEntry,
	AgentThoughtEntry,
	ConversationEntry,
	ToolCallEntry,
	UserEntry,
} from '../examples/conversation/types.js';

// ---------------------------------------------------------------------------
// Helpers (same pattern as todo.test.ts / compile.test.ts)
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

const stubMcpConfig = {
	name: 'test-relay',
	command: 'node',
	args: ['--version'],
	env: [{ name: 'STUB', value: 'true' }],
};

function createMockTransportFactory(): {
	factory: McpTransportFactory;
} {
	const factory: McpTransportFactory = async (_name) => {
		const mockStream = {
			readable: new ReadableStream<never>(),
			writable: new WritableStream<never>(),
			close: async () => {},
		} as unknown as McpToolStream;
		return {
			config: stubMcpConfig,
			stream: mockStream,
			dispose: vi.fn(async () => {}),
		} as McpTransport;
	};
	return { factory };
}

/** Helper to fire a sessionUpdate notification through the event pipeline. */
async function fireUpdate(
	events: AgentEvents,
	sessionId: string,
	update: SessionNotification['update'],
) {
	await events.sessionUpdate({ sessionId, update });
}

/** Helper to fire a prompt through the command pipeline. */
async function firePrompt(
	commands: AgentCommands,
	sessionId: string,
	text: string,
) {
	await commands.prompt({
		sessionId,
		prompt: [{ type: 'text', text }],
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConversationExtension', () => {
	describe('turn recording', () => {
		it('records a user prompt as a turn with a user entry', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const terminal = createTerminalCommands();
			const commands = joinCommands(middleware, terminal);

			await firePrompt(commands, 'test', 'hello');

			const turns = ext.conversation.get();
			expect(turns).toHaveLength(1);

			const turn = turns[0]!;
			expect(turn.entries).toHaveLength(1);

			const entry = turn.entries[0] as UserEntry;
			expect(entry.type).toBe('user');
			expect(entry.content).toHaveLength(1);
			expect((entry.content[0] as { text: string }).text).toBe('hello');
		});

		it('does not transform the prompt (passes through)', async () => {
			const ext = new ConversationExtension();
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
			await firePrompt(commands, 'test', 'hello');

			expect(captured[0]!.prompt).toHaveLength(1);
			expect((captured[0]!.prompt[0] as { text: string }).text).toBe('hello');
		});
	});

	describe('chunk coalescing', () => {
		it('coalesces agent_message_chunks with the same messageId', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'Hello' },
				messageId: 'msg-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: ' world' },
				messageId: 'msg-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: '!' },
				messageId: 'msg-1',
			});

			const turns = ext.conversation.get();
			expect(turns).toHaveLength(1);
			// user entry + one coalesced text entry
			expect(turns[0]!.entries).toHaveLength(2);

			const textEntry = turns[0]!.entries[1] as AgentTextEntry;
			expect(textEntry.type).toBe('text');
			expect(textEntry.messageId).toBe('msg-1');
			expect(textEntry.content).toHaveLength(3);
		});

		it('creates separate entries for different messageIds', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'First' },
				messageId: 'msg-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'Second' },
				messageId: 'msg-2',
			});

			const entries = ext.conversation.get()[0]!.entries;
			// user + two separate text entries
			expect(entries).toHaveLength(3);
			expect((entries[1] as AgentTextEntry).messageId).toBe('msg-1');
			expect((entries[2] as AgentTextEntry).messageId).toBe('msg-2');
		});

		it('coalesces consecutive chunks of the same type when messageId is absent', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'A' },
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'B' },
			});

			const entries = ext.conversation.get()[0]!.entries;
			// user + one coalesced text entry (consecutive chunks without messageId)
			expect(entries).toHaveLength(2);

			const textEntry = entries[1] as AgentTextEntry;
			expect(textEntry.type).toBe('text');
			expect(textEntry.content).toHaveLength(2);
			expect((textEntry.content[0] as { text: string }).text).toBe('A');
			expect((textEntry.content[1] as { text: string }).text).toBe('B');
		});

		it('starts a new entry when a different type interrupts chunks without messageId', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'A' },
			});
			await sendUpdate('test', {
				sessionUpdate: 'tool_call',
				toolCallId: 'tc-1',
				title: 'Read file',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'B' },
			});

			const entries = ext.conversation.get()[0]!.entries;
			// user + text("A") + tool_call + text("B") — tool call breaks coalescing
			expect(entries).toHaveLength(4);
			expect(entries[1]!.type).toBe('text');
			expect(entries[2]!.type).toBe('tool_call');
			expect(entries[3]!.type).toBe('text');
		});
	});

	describe('thought chunks', () => {
		it('coalesces agent_thought_chunks by messageId', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'think about this');

			await sendUpdate('test', {
				sessionUpdate: 'agent_thought_chunk',
				content: { type: 'text', text: 'Let me think...' },
				messageId: 'thought-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_thought_chunk',
				content: { type: 'text', text: ' about this.' },
				messageId: 'thought-1',
			});

			const entries = ext.conversation.get()[0]!.entries;
			expect(entries).toHaveLength(2); // user + thought

			const thought = entries[1] as AgentThoughtEntry;
			expect(thought.type).toBe('thought');
			expect(thought.messageId).toBe('thought-1');
			expect(thought.content).toHaveLength(2);
		});
	});

	describe('tool calls', () => {
		it('records a tool_call as an entry', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'do something');

			await sendUpdate('test', {
				sessionUpdate: 'tool_call',
				toolCallId: 'tc-1',
				title: 'Read file',
				status: 'in_progress',
				kind: 'read',
			});

			const entries = ext.conversation.get()[0]!.entries;
			expect(entries).toHaveLength(2); // user + tool call

			const tc = entries[1] as ToolCallEntry;
			expect(tc.type).toBe('tool_call');
			expect(tc.toolCallId).toBe('tc-1');
			expect(tc.title).toBe('Read file');
			expect(tc.status).toBe('in_progress');
			expect(tc.kind).toBe('read');
		});

		it('merges tool_call_update into existing tool call', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'do something');

			await sendUpdate('test', {
				sessionUpdate: 'tool_call',
				toolCallId: 'tc-1',
				title: 'Read file',
				status: 'in_progress',
			});
			await sendUpdate('test', {
				sessionUpdate: 'tool_call_update',
				toolCallId: 'tc-1',
				status: 'completed',
				title: 'Read file (done)',
			});

			const entries = ext.conversation.get()[0]!.entries;
			// Still just 2 entries — update merges into existing
			expect(entries).toHaveLength(2);

			const tc = entries[1] as ToolCallEntry;
			expect(tc.status).toBe('completed');
			expect(tc.title).toBe('Read file (done)');
		});
	});

	describe('ignored updates', () => {
		it('ignores user_message_chunk events', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'user_message_chunk',
				content: { type: 'text', text: 'hello' },
				messageId: 'user-1',
			});

			const entries = ext.conversation.get()[0]!.entries;
			// Only the user entry from prompt — chunk is ignored
			expect(entries).toHaveLength(1);
			expect(entries[0]!.type).toBe('user');
		});

		it('ignores plan, usage_update, and other non-content updates', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'hello');

			await sendUpdate('test', {
				sessionUpdate: 'usage_update',
				size: 1000,
				used: 500,
			} as SessionNotification['update']);

			const entries = ext.conversation.get()[0]!.entries;
			expect(entries).toHaveLength(1); // only the user entry
		});
	});

	describe('multi-turn', () => {
		it('creates separate turns for each prompt', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);

			// Turn 1
			await sendPrompt('test', 'first');
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'response 1' },
				messageId: 'msg-1',
			});

			// Turn 2
			await sendPrompt('test', 'second');
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'response 2' },
				messageId: 'msg-2',
			});

			const turns = ext.conversation.get();
			expect(turns).toHaveLength(2);

			// Turn 1: user + text
			expect(turns[0]!.entries).toHaveLength(2);
			expect((turns[0]!.entries[0] as UserEntry).type).toBe('user');
			expect(
				((turns[0]!.entries[0] as UserEntry).content[0] as { text: string })
					.text,
			).toBe('first');

			// Turn 2: user + text
			expect(turns[1]!.entries).toHaveLength(2);
			expect(
				((turns[1]!.entries[0] as UserEntry).content[0] as { text: string })
					.text,
			).toBe('second');
		});
	});

	describe('entry ordering', () => {
		it('preserves chronological order of mixed entry types', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { sendPrompt, sendUpdate } = setupTest(middleware);
			await sendPrompt('test', 'do things');

			await sendUpdate('test', {
				sessionUpdate: 'agent_thought_chunk',
				content: { type: 'text', text: 'thinking...' },
				messageId: 'thought-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'I will read a file' },
				messageId: 'msg-1',
			});
			await sendUpdate('test', {
				sessionUpdate: 'tool_call',
				toolCallId: 'tc-1',
				title: 'Read file',
			});
			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'Here is the result' },
				messageId: 'msg-2',
			});

			const types = ext.conversation
				.get()[0]!
				.entries.map((e: ConversationEntry) => e.type);
			expect(types).toEqual(['user', 'thought', 'text', 'tool_call', 'text']);
		});
	});

	describe('store subscription', () => {
		it('fires on prompt and sessionUpdate', async () => {
			const ext = new ConversationExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const listener = vi.fn();
			ext.conversation.subscribe(listener);

			const { sendPrompt, sendUpdate } = setupTest(middleware);

			await sendPrompt('test', 'hello');
			expect(listener).toHaveBeenCalledTimes(1);

			await sendUpdate('test', {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
				messageId: 'msg-1',
			});
			expect(listener).toHaveBeenCalledTimes(2);
		});
	});

	describe('independence', () => {
		it('two instances do not share state', async () => {
			const ext1 = new ConversationExtension();
			const ext2 = new ConversationExtension();

			const { factory: f1 } = createMockTransportFactory();
			const { factory: f2 } = createMockTransportFactory();
			const mw1 = await compileExtension(ext1, f1);
			await compileExtension(ext2, f2);

			const { sendPrompt } = setupTest(mw1);
			await sendPrompt('test', 'only in ext1');

			expect(ext1.conversation.get()).toHaveLength(1);
			expect(ext2.conversation.get()).toHaveLength(0);
		});
	});
});
