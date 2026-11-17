import type { ReadonlyStore, Store } from '@franklin/agent';
import { formatDirective } from './syntax/format.js';
import type { DirectiveRegistry } from './registry.js';

export class DirectiveInstance<T> {
	readonly text: string;
	readonly state: ReadonlyStore<T>;

	constructor(
		readonly registry: DirectiveRegistry,
		readonly name: string,
		readonly id: string,
	) {
		this.text = formatDirective(name, id);
		this.state = {
			get: () => registry.getState(name, id) as T,
			subscribe: (listener) => {
				let previous = this.state.get();
				return registry.subscribe(() => {
					const next = this.state.get();
					if (Object.is(previous, next)) return;
					previous = next;
					listener(next);
				});
			},
		};
	}

	update = (recipe: Parameters<Store<T>['set']>[0]): Promise<void> =>
		this.registry.update(this.name, this.id, recipe);
}
