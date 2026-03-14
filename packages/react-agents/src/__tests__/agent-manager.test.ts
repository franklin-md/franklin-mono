import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';
import { AgentSideConnection } from '@agentclientprotocol/sdk';
import { AgentConnection } from '@franklin/agent';

import { createMemoryTransport } from '../../../agent/src/transport/in-memory.js';
import { createMockAgent } from '../../../agent/src/__tests__/helpers.js';
import { AgentManager, ManagedSession } from '../agent-manager.js';

function createTestManager() {
	const connections: AgentConnection[] = [];

	const manager = new AgentManager({
		createConnection: async (_agent, _cwd) => {
			const { transport, agentStream } = createMemoryTransport();
			const mockAgent = createMockAgent();

			void new AgentSideConnection((conn) => {
				mockAgent.conn = conn;
				return {
					initialize: (p) => mockAgent.initialize(p),
					newSession: (p) => mockAgent.newSession(p),
					prompt: (p) => mockAgent.prompt(p),
					cancel: (p) => mockAgent.cancel(p),
					authenticate: (p) => mockAgent.authenticate(p),
				};
			}, agentStream);

			const connection = new AgentConnection(transport);
			connections.push(connection);
			return connection;
		},
	});

	return { manager, connections };
}

function createTestManagerWithMockAgent() {
	const mockAgents: Array<ReturnType<typeof createMockAgent>> = [];

	const manager = new AgentManager({
		createConnection: async (_agent, _cwd) => {
			const { transport, agentStream } = createMemoryTransport();
			const mockAgent = createMockAgent();
			mockAgents.push(mockAgent);

			void new AgentSideConnection((conn) => {
				mockAgent.conn = conn;
				return {
					initialize: (p) => mockAgent.initialize(p),
					newSession: (p) => mockAgent.newSession(p),
					prompt: (p) => mockAgent.prompt(p),
					cancel: (p) => mockAgent.cancel(p),
					authenticate: (p) => mockAgent.authenticate(p),
				};
			}, agentStream);

			return new AgentConnection(transport);
		},
	});

	return { manager, mockAgents };
}

describe('AgentManager', () => {
	const managers: AgentManager[] = [];

	afterEach(async () => {
		for (const manager of managers) {
			await manager.disposeAll();
		}
		managers.length = 0;
	});

	it('starts with an empty snapshot', () => {
		const { manager } = createTestManager();
		managers.push(manager);

		expect(manager.getSnapshot()).toEqual([]);
	});

	it('spawns a session and adds it to the snapshot', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test', { id: 'my-agent' });

		expect(session).toBeInstanceOf(ManagedSession);
		expect(session.id).toBe('my-agent');
		expect(session.agentName).toBe('claude');
		expect(session.sessionId).toBe('test-session');
		expect(session.status).toBe('idle');
		expect(session.store.getSnapshot()).toEqual({ transcript: [] });

		const snapshot = manager.getSnapshot();
		expect(snapshot).toHaveLength(1);
		expect(snapshot[0]).toBe(session);
	});

	it('generates an id when none is provided', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');
		expect(session.id).toMatch(/^agent-\d+$/);
	});

	it('throws when spawning with a duplicate id', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		await manager.spawn('claude', '/test', { id: 'dup' });
		await expect(
			manager.spawn('claude', '/test', { id: 'dup' }),
		).rejects.toThrow('Session with id "dup" already exists');
	});

	it('retrieves a session by id', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test', { id: 'find-me' });

		expect(manager.get('find-me')).toBe(session);
		expect(manager.get('not-here')).toBeUndefined();
	});

	it('disposes a single session and removes it from snapshot', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test', { id: 'rm' });
		await manager.dispose('rm');

		expect(manager.get('rm')).toBeUndefined();
		expect(manager.getSnapshot()).toHaveLength(0);
		expect(session.status).toBe('disposed');
	});

	it('disposeAll cleans up all sessions', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const s1 = await manager.spawn('claude', '/test', { id: 'a' });
		const s2 = await manager.spawn('claude', '/test', { id: 'b' });

		await manager.disposeAll();

		expect(manager.getSnapshot()).toHaveLength(0);
		expect(s1.status).toBe('disposed');
		expect(s2.status).toBe('disposed');
	});

	it('notifies listeners on spawn', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const listener = vi.fn();
		manager.subscribe(listener);

		await manager.spawn('claude', '/test');

		expect(listener).toHaveBeenCalled();
	});

	it('notifies listeners on dispose', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		await manager.spawn('claude', '/test', { id: 'x' });

		const listener = vi.fn();
		manager.subscribe(listener);

		await manager.dispose('x');

		expect(listener).toHaveBeenCalled();
	});

	it('unsubscribe stops notifications', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const listener = vi.fn();
		const unsub = manager.subscribe(listener);

		unsub();
		await manager.spawn('claude', '/test');

		expect(listener).not.toHaveBeenCalled();
	});

	it('snapshot is a new array reference on each change', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const snap1 = manager.getSnapshot();
		await manager.spawn('claude', '/test');
		const snap2 = manager.getSnapshot();

		expect(snap1).not.toBe(snap2);
	});
});

describe('ManagedSession', () => {
	const managers: AgentManager[] = [];

	afterEach(async () => {
		for (const manager of managers) {
			await manager.disposeAll();
		}
		managers.length = 0;
	});

	it('transitions idle → running → idle on successful prompt', async () => {
		const { manager, mockAgents } = createTestManagerWithMockAgent();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test', { id: 'status' });
		const statuses: string[] = [];

		const listener = vi.fn(() => {
			statuses.push(session.status);
		});
		manager.subscribe(listener);

		expect(session.status).toBe('idle');

		await session.prompt('hello');

		// Should have gone through running → idle
		expect(statuses).toContain('running');
		expect(session.status).toBe('idle');
		expect(mockAgents).toHaveLength(1);
	});

	it('transitions idle → running → error on failed prompt', async () => {
		const { manager, mockAgents } = createTestManagerWithMockAgent();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test', { id: 'err' });

		mockAgents[0]!.prompt = vi.fn(async () => {
			throw new Error('agent crashed');
		});

		await expect(session.prompt('hello')).rejects.toThrow();
		expect(session.status).toBe('error');
	});

	it('throws when prompting a disposed session', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');
		await session.dispose();

		await expect(session.prompt('hello')).rejects.toThrow(
			'Cannot prompt a disposed session',
		);
	});

	it('dispose is idempotent', async () => {
		const { manager } = createTestManager();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');
		await session.dispose();
		await session.dispose(); // should not throw
		expect(session.status).toBe('disposed');
	});

	it('captures transcript via the store', async () => {
		const { manager, mockAgents } = createTestManagerWithMockAgent();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');

		mockAgents[0]!.prompt = vi.fn<
			(p: PromptRequest) => Promise<PromptResponse>
		>(async (params) => {
			const ac = mockAgents[0]!.conn!;
			await ac.sessionUpdate({
				sessionId: params.sessionId,
				update: {
					sessionUpdate: 'agent_message_chunk',
					content: { type: 'text', text: 'hi from agent' },
				},
			});
			return { stopReason: 'end_turn' as const };
		});

		await session.prompt('test');

		const transcript = session.store.getSnapshot().transcript;
		expect(transcript).toHaveLength(2);
		expect(transcript[0]?.notification.update).toMatchObject({
			sessionUpdate: 'user_message_chunk',
			content: { type: 'text', text: 'test' },
		});
		expect(transcript[1]?.notification.update).toEqual({
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text: 'hi from agent' },
		});
	});

	it('sends a client-generated messageId and records it on the user transcript entry', async () => {
		const { manager, mockAgents } = createTestManagerWithMockAgent();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');
		let capturedPrompt: PromptRequest | undefined;

		mockAgents[0]!.prompt = vi.fn<
			(p: PromptRequest) => Promise<PromptResponse>
		>(async (params) => {
			capturedPrompt = params;
			return { stopReason: 'end_turn' as const };
		});

		await session.prompt('test');

		expect(capturedPrompt?.messageId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);

		const transcript = session.store.getSnapshot().transcript;
		expect(transcript[0]?.notification.update).toMatchObject({
			sessionUpdate: 'user_message_chunk',
			messageId: capturedPrompt?.messageId,
			content: { type: 'text', text: 'test' },
		});
	});

	it('notifies manager listeners on status change', async () => {
		const { manager } = createTestManagerWithMockAgent();
		managers.push(manager);

		const session = await manager.spawn('claude', '/test');
		const listener = vi.fn();
		manager.subscribe(listener);

		await session.prompt('hello');

		// running + idle = at least 2 notifications
		expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
	});
});
