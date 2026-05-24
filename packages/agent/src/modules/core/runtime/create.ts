import { createObserver } from '@franklin/lib';
import type { MiniACPClientHandle } from '@franklin/mini-acp';
import type { AgentController } from '../controller/index.js';
import type { CoreEvent, CoreRuntime, ToolRegistry } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: MiniACPClientHandle;
	readonly controller: AgentController;
};

export function createCoreRuntime({
	client,
	controller,
}: CreateCoreRuntimeInput): CoreRuntime {
	const observer = createObserver<[CoreEvent]>();
	const notify = (event: CoreEvent) => {
		observer.notify(event);
	};
	const coreEvents = {
		subscribe: (listener: (event: CoreEvent) => void) =>
			observer.subscribe(listener),
	};

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			notify({ type: 'llm-config-changed' });
		},
		async *prompt(message) {
			try {
				yield* client.prompt(message);
			} finally {
				notify({ type: 'turn-settled' });
			}
		},
		cancel: client.cancel.bind(client),
		async dispose() {
			await client.dispose();
		},

		coreEvents,
		toolRegistry: createToolRegistryRuntime(controller, notify),
		getSession: () => controller.getSession(),
		async inspect() {
			return controller.inspect();
		},
	};
}

function createToolRegistryRuntime(
	controller: Pick<AgentController, 'setToolEnabled'>,
	notify: (event: CoreEvent) => void,
): ToolRegistry {
	return {
		setEnabled(name, enabled) {
			if (!controller.setToolEnabled(name, enabled)) return;
			notify({ type: 'tool-registry-changed' });
		},
	};
}
