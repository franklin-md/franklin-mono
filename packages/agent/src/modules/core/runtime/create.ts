import { createObserver } from '@franklin/lib';
import type { ContextManager } from '../context-manager/index.js';
import type { ToolFilter } from '../state.js';
import { attachContextManager } from './context-manager.js';
import { createClientRuntime } from './from-client.js';
import type {
	AgentClient,
	CoreEvent,
	CoreRuntime,
	RuntimeToolRegistry,
} from './types.js';

type ToolRegistryState = {
	setEnabled(name: string, enabled: boolean): void;
	filter(): ToolFilter;
};

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly contextManager: ContextManager;
	readonly toolRegistry: ToolRegistryState;
};

export function createCoreRuntime({
	client,
	contextManager,
	toolRegistry,
}: CreateCoreRuntimeInput): CoreRuntime {
	const observer = createObserver<[CoreEvent]>();
	const notify = (event: CoreEvent) => {
		observer.notify(event);
	};
	const coreEvents = {
		subscribe: (listener: (event: CoreEvent) => void) =>
			observer.subscribe(listener),
	};

	return attachContextManager(
		{
			...createClientRuntime({
				client,
				events: {
					coreEvents,
					notify,
				},
			}),
			toolRegistry: createRuntimeToolRegistry(toolRegistry, notify),
			getSession: () => contextManager.getSnapshot(),
		},
		contextManager,
	);
}

function createRuntimeToolRegistry(
	toolRegistry: ToolRegistryState,
	notify: (event: CoreEvent) => void,
): RuntimeToolRegistry {
	return {
		setEnabled(name, enabled) {
			const before = toolRegistry.filter();
			toolRegistry.setEnabled(name, enabled);
			if (sameToolFilter(before, toolRegistry.filter())) return;
			notify({ type: 'tool-registry-changed' });
		},
	};
}

function sameToolFilter(left: ToolFilter, right: ToolFilter): boolean {
	return JSON.stringify(left.disabled) === JSON.stringify(right.disabled);
}
