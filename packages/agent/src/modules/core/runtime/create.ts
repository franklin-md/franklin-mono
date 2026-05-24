import { createObserver } from '@franklin/lib';
import type { Context, MiniACPClientHandle } from '@franklin/mini-acp';
import type { ContextManager } from '../context-manager/index.js';
import type { ToolFilter } from '../state.js';
import type { CoreEvent, CoreRuntime, ToolRegistry } from './types.js';

type ToolRegistryState = {
	setEnabled(name: string, enabled: boolean): void;
	filter(): ToolFilter;
};

type CreateCoreRuntimeInput = {
	readonly client: MiniACPClientHandle;
	readonly contextManager: ContextManager;
	readonly toolRegistry: ToolRegistryState;
};

async function* notifyAfter<T>(
	stream: AsyncIterable<T>,
	notify: () => void,
): AsyncIterable<T> {
	try {
		yield* stream;
	} finally {
		notify();
	}
}

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

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			notify({ type: 'llm-config-changed' });
		},
		prompt(message) {
			return notifyAfter(client.prompt(message), () =>
				notify({ type: 'turn-settled' }),
			);
		},
		cancel: client.cancel.bind(client),
		async dispose() {
			await client.dispose();
		},
		coreEvents,
		toolRegistry: createToolRegistryRuntime(toolRegistry, notify),
		getSession: () => contextManager.getSnapshot(),
		async inspect() {
			return {
				core: redactInspectContext(contextManager.getAgentContext()),
			};
		},
	};
}

function createToolRegistryRuntime(
	toolRegistry: ToolRegistryState,
	notify: (event: CoreEvent) => void,
): ToolRegistry {
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

function redactInspectContext(context: Context): Context {
	const { apiKey: _apiKey, ...config } = context.config;
	return { ...context, config };
}
