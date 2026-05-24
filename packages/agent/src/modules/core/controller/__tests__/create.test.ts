import type {
	ContextPatch,
	MiniACPClientHandle,
	MiniACPConnector,
} from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createAgentClient } from '../../compile/client.js';
import { createToolRegistry } from '../../tools/index.js';
import { createCoreRegistry } from '../../__tests__/registry.js';
import { createAgentController } from '../create.js';

function createClient(): MiniACPClientHandle {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async (_context: ContextPatch) => {}),
		async *prompt() {},
		cancel: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function createController() {
	const registrations = createCoreRegistry();
	return createAgentController({
		snapshot: {
			messages: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: { disabled: [] },
		},
		registrations,
		toolRegistry: createToolRegistry(registrations.tools),
	});
}

describe('createAgentController', () => {
	it('connects with the controller server and initializes without eager context sync', async () => {
		const connectedClient = createClient();
		const connector = vi.fn<MiniACPConnector>(async () => connectedClient);
		const controller = createController();

		await createAgentClient({
			connectAgent: connector,
			controller,
		});

		expect(connector).toHaveBeenCalledExactlyOnceWith(controller.server);
		expect(connectedClient.initialize).toHaveBeenCalledOnce();
		expect(connectedClient.setContext).not.toHaveBeenCalled();
	});

	it('keeps cancel as a pass-through to the connected Mini-ACP client', async () => {
		const connectedClient = createClient();
		const connector = vi.fn<MiniACPConnector>(async () => connectedClient);
		const controller = createController();
		const client = await createAgentClient({
			connectAgent: connector,
			controller,
		});

		await client.cancel();

		expect(connectedClient.cancel).toHaveBeenCalledOnce();
	});
});
