import { freeze, produce } from 'immer';
import type { Store } from '@franklin/agent';
import { createObserver } from '@franklin/lib';
import type { SingleFilePersister } from '@franklin/lib';
import type { App } from 'obsidian';
import type { ComponentType } from 'react';
import { DirectiveInstance } from './instance.js';
import { parseDirectiveState } from './storage/state.js';
import { directiveName } from './storage/codec.js';
import type { DirectiveDocument, DirectiveState } from './storage/codec.js';
import type {
	DirectiveDefinition,
	DirectiveProps,
	RegisteredDirective,
} from './types.js';

// Obsidian keeps the App when reloading a plugin, but evaluates its bundle again.
// A shared symbol lets the next bundle wait for writes accepted before unload.
const drainingWrites = Symbol.for('franklin.directives.drainingWrites');
type Options = {
	app: App & { [drainingWrites]?: Promise<void> };
	persistence: SingleFilePersister<DirectiveDocument>;
};

export class DirectiveRegistry {
	readonly app: App;
	private readonly definitions = new Map<string, RegisteredDirective>();
	private readonly removals = new Map<string, (id: string) => void>();
	private changed = createObserver();
	private writes = Promise.resolve();
	private closed = false;
	private closing?: Promise<void>;

	private constructor(
		private readonly options: Options,
		private document: DirectiveDocument,
	) {
		this.app = options.app;
	}

	static async create(options: Options): Promise<DirectiveRegistry> {
		await options.app[drainingWrites];
		const restored = await options.persistence.load();
		if (restored.issues.length > 0)
			throw new Error(
				`Could not load directives: ${restored.issues.map((issue) => issue.kind).join(', ')}`,
			);
		return new DirectiveRegistry(
			options,
			freeze(restored.value ?? { version: 1, instances: {} }, true),
		);
	}

	registerDirective<T>(
		name: string,
		Renderer: ComponentType<DirectiveProps<T>>,
	): DirectiveDefinition<T> {
		this.assertOpen();
		if (!directiveName.safeParse(name).success)
			throw new Error('Invalid directive name');
		if (this.definitions.has(name))
			throw new Error(`Directive already registered: ${name}`);
		const instances = new Map<string, DirectiveInstance<T>>();
		const handle = (id: string) => {
			let instance = instances.get(id);
			if (!instance) {
				instance = new DirectiveInstance<T>(this, name, id);
				instances.set(id, instance);
			}
			return instance;
		};
		const get = (id: string) =>
			this.document.instances[id]?.name === name ? handle(id) : undefined;
		const removed = createObserver<[DirectiveInstance<T>]>();
		const definition: DirectiveDefinition<T> = {
			name,
			get,
			instances: () =>
				Object.entries(this.document.instances)
					.filter(([, record]) => record.name === name)
					.map(([id]) => handle(id)),
			create: async (state) => {
				const id = crypto.randomUUID();
				const snapshot = parseDirectiveState(state);
				await this.save(name, id, () => snapshot);
				return handle(id);
			},
			onRemoved: (handler) => removed.subscribe(isolated(handler)),
		};
		this.definitions.set(name, ({ id, state }) => (
			<Renderer id={id} state={state as T} update={handle(id).update} />
		));
		this.removals.set(name, (id) => removed.notify(handle(id)));
		this.changed.notify();
		return definition;
	}

	reportRemoved(name: string, id: string): void {
		if (this.getRecord(name, id)) this.removals.get(name)?.(id);
	}

	getRecord(name: string, id: string) {
		const record = this.document.instances[id];
		if (!this.closed && record?.name === name && this.definitions.has(name))
			return record;
	}

	getRenderer(name: string) {
		return this.definitions.get(name);
	}

	getState(name: string, id: string): DirectiveState {
		const record = this.document.instances[id];
		if (record?.name !== name)
			throw new Error(`Unknown directive instance: ${id}`);
		return record.state;
	}

	update<T>(
		name: string,
		id: string,
		recipe: Parameters<Store<T>['set']>[0],
	): Promise<void> {
		return this.save(name, id, () => {
			const current = this.getState(name, id) as T;
			return parseDirectiveState(produce<T, T>(current, recipe));
		});
	}

	subscribe = (listener: () => void): (() => void) =>
		this.changed.subscribe(isolated(listener));

	dispose(after?: Promise<void>): Promise<void> {
		if (this.closing) return this.closing;
		// Quick Edit can still save its stopped state while its runner shuts down.
		// Publish the barrier now so a reload cannot read before that save drains.
		this.closing = this.close(after);
		this.options.app[drainingWrites] = this.closing;
		return this.closing;
	}

	private async close(after?: Promise<void>): Promise<void> {
		if (after) await after;
		this.closed = true;
		await this.writes;
		this.definitions.clear();
		this.removals.clear();
		this.changed.notify();
		// Release subscribers; Observer has no clear.
		this.changed = createObserver();
	}

	private save(
		name: string,
		id: string,
		nextState: () => DirectiveState,
	): Promise<void> {
		if (this.closed)
			return Promise.reject(new Error('Directive registry is closed'));
		const write = this.writes.then(async () => {
			const next: DirectiveDocument = {
				...this.document,
				instances: {
					...this.document.instances,
					[id]: { name, state: nextState() },
				},
			};
			await this.options.persistence.save(next);
			this.document = freeze(next, true);
			this.changed.notify();
		});
		this.writes = write.catch(() => {});
		return write;
	}

	private assertOpen(): void {
		if (this.closed) throw new Error('Directive registry is closed');
	}
}

// A failing subscriber is reported without skipping later subscribers or
// failing the save or edit that notified it.
function isolated<A extends unknown[]>(
	listener: (...args: A) => void,
): (...args: A) => void {
	return (...args) => {
		try {
			listener(...args);
		} catch (error) {
			console.error('Franklin directive subscriber failed', error);
		}
	};
}
