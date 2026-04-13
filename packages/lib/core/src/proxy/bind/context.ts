interface StoredInstance {
	readonly unbind: () => void;
	readonly dispose: () => Promise<void>;
}

export interface ResourceContext {
	store(id: string, unbind: () => void, dispose: () => Promise<void>): void;
	kill(id: string): Promise<void>;
	dispose(): Promise<void>;
}

export function createResourceContext(): ResourceContext {
	const instances = new Map<string, StoredInstance>();

	const kill = async (id: string) => {
		const entry = instances.get(id);
		if (!entry) return;
		instances.delete(id);
		entry.unbind();
		await entry.dispose();
	};

	return {
		store(id, unbind, dispose) {
			instances.set(id, { unbind, dispose });
		},

		kill,

		async dispose() {
			const ids = [...instances.keys()];
			await Promise.allSettled(ids.map((id) => kill(id)));
		},
	};
}
