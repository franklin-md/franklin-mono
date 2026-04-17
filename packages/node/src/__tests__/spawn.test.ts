import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMockDuplex() {
	return {
		readable: new ReadableStream(),
		writable: new WritableStream(),
		dispose: vi.fn(async () => {}),
	};
}

vi.mock('@franklin/lib/transport', () => ({
	createDuplexPair: vi.fn(),
}));

vi.mock('@franklin/mini-acp', () => ({
	createAgentConnection: vi.fn(),
	createPiAdapter: vi.fn(),
	createSessionAdapter: vi.fn(),
	debugMiniACP: vi.fn((endpoint: unknown, label: string) => ({
		endpoint,
		label,
	})),
}));

describe('spawn', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('debug-wraps both the agent session and reverse RPC server', async () => {
		const transport = await import('@franklin/lib/transport');
		const miniACP = await import('@franklin/mini-acp');

		const clientDuplex = createMockDuplex();
		const agentDuplex = createMockDuplex();
		vi.mocked(transport.createDuplexPair).mockReturnValue({
			a: clientDuplex,
			b: agentDuplex,
		} as ReturnType<typeof transport.createDuplexPair>);

		const remote = {
			toolExecute: vi.fn(async () => ({ toolCallId: 'tool-1', content: [] })),
		};
		const bind = vi.fn();
		vi.mocked(miniACP.createAgentConnection).mockReturnValue({
			remote,
			bind,
		} as ReturnType<typeof miniACP.createAgentConnection>);

		const session = {
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(),
			cancel: vi.fn(async () => {}),
		};
		vi.mocked(miniACP.createSessionAdapter).mockReturnValue(
			session as ReturnType<typeof miniACP.createSessionAdapter>,
		);

		const turnClient = {
			prompt: vi.fn(),
			cancel: vi.fn(async () => {}),
		};
		vi.mocked(miniACP.createPiAdapter).mockReturnValue(
			turnClient as ReturnType<typeof miniACP.createPiAdapter>,
		);

		const { spawn } = await import('../platform/spawn.js');
		const result = spawn();

		expect(result).toBe(clientDuplex);
		expect(miniACP.createAgentConnection).toHaveBeenCalledWith(agentDuplex);
		expect(miniACP.createSessionAdapter).toHaveBeenCalledOnce();
		expect(miniACP.debugMiniACP).toHaveBeenCalledWith(session, 'agent');
		expect(bind).toHaveBeenCalledWith({ endpoint: session, label: 'agent' });

		const [createTurnClient, server] = vi.mocked(miniACP.createSessionAdapter)
			.mock.calls[0]!;
		const ctx = {
			history: { systemPrompt: '', messages: [] },
			tools: [],
			config: {},
		};
		const turnServer = {
			toolExecute: vi.fn(async () => ({ toolCallId: 'tool-2', content: [] })),
		};

		const created = createTurnClient(ctx, turnServer);

		expect(server).toBe(remote);
		expect(miniACP.debugMiniACP).toHaveBeenCalledWith(turnServer, 'agent');
		expect(miniACP.createPiAdapter).toHaveBeenCalledWith({
			ctx,
			server: { endpoint: turnServer, label: 'agent' },
		});
		expect(created).toBe(turnClient);
	});
});
