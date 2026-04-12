interface StoredInstance {
	readonly value: unknown;
	readonly dispose: () => Promise<void>;
	readonly onKill?: () => void;
}

// TODO: Get rid of. The dispose of resource is called, and if it has a transport
// The implementation should wire that up automatically (transport doesnt have close)
function inferDispose(value: unknown): () => Promise<void> {
	const maybeDisposable = value as {
		dispose?: () => Promise<void> | void;
		close?: () => Promise<void> | void;
	};

	if (typeof maybeDisposable.dispose === 'function') {
		return async () => {
			await maybeDisposable.dispose?.();
		};
	}

	if (typeof maybeDisposable.close === 'function') {
		return async () => {
			await maybeDisposable.close?.();
		};
	}

	return async () => {};
}

export interface ResourceContext {
	store(id: string, instance: unknown, onKill?: () => void): void;
	kill(id: string): Promise<void>;
	dispose(): Promise<void>;
}

export function createResourceContext(): ResourceContext {
	const instances = new Map<string, StoredInstance>();

	const kill = async (id: string) => {
		const entry = instances.get(id);
		if (!entry) return;
		instances.delete(id);
		entry.onKill?.();
		await entry.dispose();
	};

	return {
		store(id, instance, onKill) {
			instances.set(id, {
				value: instance,
				dispose: inferDispose(instance),
				onKill,
			});
		},

		kill,

		async dispose() {
			const ids = [...instances.keys()];
			await Promise.allSettled(ids.map((id) => kill(id)));
		},
	};
}
