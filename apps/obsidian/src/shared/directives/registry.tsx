import { createStore } from '@franklin/agent';
import type { Store } from '@franklin/agent';
import type { JsonValue, SingleFilePersister } from '@franklin/lib';
import type { App } from 'obsidian';
import { useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import { DirectiveInstance } from './instance.js';
import { copyDirectiveState } from './storage/state.js';
import type { DirectiveDocument } from './storage/types.js';
import type {
	DirectiveDefinition,
	DirectiveProps,
	RegisteredDirective,
} from './types.js';

type Options = {
	app: App;
	persistence: SingleFilePersister<DirectiveDocument>;
};

export class DirectiveRegistry {
	readonly app: App;
	private readonly definitions = new Map<string, RegisteredDirective>();
	private readonly listeners = new Set<() => void>();
	private readonly store;
	private writes = Promise.resolve();
	private closed = false;

	private constructor(
		private readonly options: Options,
		document: DirectiveDocument,
	) {
		this.app = options.app;
		this.store = createStore(document);
	}

	static async create(options: Options): Promise<DirectiveRegistry> {
		const restored = await options.persistence.load();
		if (restored.issues.length > 0)
			throw new Error(
				`Could not load directives: ${restored.issues.map((issue) => issue.kind).join(', ')}`,
			);
		return new DirectiveRegistry(
			options,
			restored.value ?? { version: 1, instances: {} },
		);
	}

	registerDirective<T>(
		name: string,
		Renderer: ComponentType<DirectiveProps<T>>,
	): DirectiveDefinition<T> {
		this.assertOpen();
		if (!/^[a-z][a-z0-9-]*$/.test(name))
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
			this.store.get().instances[id]?.name === name ? handle(id) : undefined;
		const definition: DirectiveDefinition<T> = {
			name,
			get,
			instances: () =>
				Object.entries(this.store.get().instances)
					.filter(([, record]) => record.name === name)
					.map(([id]) => handle(id)),
			create: async (state) => {
				const id = crypto.randomUUID();
				const value = copyDirectiveState(state);
				await this.commit((draft) => {
					draft.instances[id] = { name, state: value };
				});
				return handle(id);
			},
		};
		this.definitions.set(name, function Registered({ id }) {
			const instance = handle(id);
			const state = useSyncExternalStore(
				(notify) => instance.state.subscribe(notify),
				() => instance.state.get(),
			);
			return <Renderer id={id} state={state} update={instance.update} />;
		});
		this.notify();
		return definition;
	}

	getRenderer(name: string, id: string): RegisteredDirective | undefined {
		if (this.closed || this.store.get().instances[id]?.name !== name)
			return undefined;
		return this.definitions.get(name);
	}

	getState(name: string, id: string): JsonValue {
		const record = this.store.get().instances[id];
		if (record?.name !== name)
			throw new Error(`Unknown directive instance: ${id}`);
		return record.state;
	}

	update<T>(
		name: string,
		id: string,
		recipe: Parameters<Store<T>['set']>[0],
	): Promise<void> {
		return this.commit((draft) => {
			const record = draft.instances[id];
			if (record?.name !== name)
				throw new Error(`Unknown directive instance: ${id}`);
			const state = createStore(record.state as T);
			state.set(recipe);
			record.state = copyDirectiveState(state.get());
		});
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	async dispose(): Promise<void> {
		this.closed = true;
		await this.writes;
		this.definitions.clear();
		this.notify();
		this.listeners.clear();
	}

	private commit(
		recipe: Parameters<Store<DirectiveDocument>['set']>[0],
	): Promise<void> {
		if (this.closed)
			return Promise.reject(new Error('Directive registry is closed'));
		const write = this.writes.then(async () => {
			const next = createStore(this.store.get());
			next.set(recipe);
			await this.options.persistence.save(next.get());
			this.store.set(() => next.get());
			this.notify();
		});
		this.writes = write.catch(() => {});
		return write;
	}

	private assertOpen(): void {
		if (this.closed) throw new Error('Directive registry is closed');
	}

	private notify(): void {
		for (const listener of this.listeners) listener();
	}
}
