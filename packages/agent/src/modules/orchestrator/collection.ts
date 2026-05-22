import { createObserver } from '@franklin/lib';
import type { DetailsRuntime } from './internal/details/index.js';
import type { RuntimeEntry, RuntimeEvent } from './types.js';

export class RuntimeCollection<Runtime extends DetailsRuntime> {
	private readonly runtimes = new Map<string, RuntimeEntry<Runtime>>();
	private readonly observer = createObserver<[RuntimeEvent<Runtime>]>();

	get(id: string): RuntimeEntry<Runtime> | undefined {
		return this.runtimes.get(id);
	}

	has(id: string): boolean {
		return this.runtimes.has(id);
	}

	set(runtime: Runtime): RuntimeEntry<Runtime> {
		const entry = { details: runtime.details, runtime };
		this.runtimes.set(entry.details.id, entry);
		this.observer.notify({
			action: 'add',
			id: entry.details.id,
			runtime,
		});
		return entry;
	}

	async remove(id: string): Promise<boolean> {
		const entry = this.runtimes.get(id);
		if (!entry) return false;
		this.runtimes.delete(id);
		this.observer.notify({
			action: 'remove',
			id,
			runtime: entry.runtime,
		});
		await entry.runtime.dispose();
		return true;
	}

	list(): RuntimeEntry<Runtime>[] {
		return Array.from(this.runtimes.values());
	}

	subscribe(listener: (event: RuntimeEvent<Runtime>) => void): () => void {
		return this.observer.subscribe(listener);
	}
}
