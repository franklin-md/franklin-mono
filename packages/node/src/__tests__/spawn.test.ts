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
	createPiAgent: vi.fn(),
}));

vi.mock('@franklin/mini-acp/debug', () => ({
	debugMiniACP: vi.fn((endpoint: unknown, label: string) => ({
		endpoint,
		label,
	})),
}));

vi.mock('@franklin/mini-acp/rpc', () => ({
	bindMiniACPRpcAgent: vi.fn(),
}));

describe('spawn', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('creates a Pi agent and debug-wraps both protocol directions', async () => {
		const transport = await import('@franklin/lib/transport');
		const miniACP = await import('@franklin/mini-acp');
		const miniACPDebug = await import('@franklin/mini-acp/debug');
		const miniACPRpc = await import('@franklin/mini-acp/rpc');
		const streamFn = vi.fn();

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
		vi.mocked(miniACPRpc.bindMiniACPRpcAgent).mockReturnValue({
			remote,
			bind,
		} as ReturnType<typeof miniACPRpc.bindMiniACPRpcAgent>);

		const agent = {
			initialize: vi.fn(async () => {}),
			setContext: vi.fn(async () => {}),
			prompt: vi.fn(),
			cancel: vi.fn(async () => {}),
		};
		vi.mocked(miniACP.createPiAgent).mockReturnValue(
			agent as ReturnType<typeof miniACP.createPiAgent>,
		);

		const { spawn } = await import('../platform/spawn.js');
		const result = spawn({ streamFn });

		expect(result).toBe(clientDuplex);
		expect(miniACPRpc.bindMiniACPRpcAgent).toHaveBeenCalledWith(agentDuplex);
		expect(miniACPDebug.debugMiniACP).toHaveBeenCalledWith(
			remote,
			'agent:tools',
		);
		expect(miniACP.createPiAgent).toHaveBeenCalledWith(
			{ endpoint: remote, label: 'agent:tools' },
			{ streamFn },
		);
		expect(miniACPDebug.debugMiniACP).toHaveBeenCalledWith(
			agent,
			'agent:client',
		);
		expect(bind).toHaveBeenCalledWith({
			endpoint: agent,
			label: 'agent:client',
		});
	});
});
