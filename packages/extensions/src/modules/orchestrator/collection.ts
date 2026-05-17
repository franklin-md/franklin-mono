import { createObserver } from '@franklin/lib';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { RuntimeEntry, RuntimeEvent } from './types.js';

export class RuntimeCollection<Runtime extends BaseRuntime> {
	private readonly runtimes = new Map<string, RuntimeEntry<Runtime>>();
	private readonly observer = createObserver<[RuntimeEvent<Runtime>]>();

	get(id: string): RuntimeEntry<Runtime> | undefined {
		return this.runtimes.get(id);
	}

	has(id: string): boolean {
		return this.runtimes.has(id);
	}

	set(id: string, runtime: Runtime): void {
		this.runtimes.set(id, { id, runtime });
		this.observer.notify({ action: 'add', id, runtime });
	}

	async remove(id: string): Promise<boolean> {
		const entry = this.runtimes.get(id);
		if (!entry) return false;
		this.runtimes.delete(id);
		this.observer.notify({ action: 'remove', id, runtime: entry.runtime });
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
