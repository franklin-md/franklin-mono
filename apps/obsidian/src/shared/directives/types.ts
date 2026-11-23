import type { Store } from '@franklin/agent';
import type { ComponentType } from 'react';
import type { DirectiveInstance } from './instance.js';

export type DirectiveProps<T> = {
	id: string;
	state: T;
	update: (recipe: Parameters<Store<T>['set']>[0]) => Promise<void>;
};

type DirectiveRemovedHandler<T> = (instance: DirectiveInstance<T>) => void;

export type DirectiveDefinition<T> = {
	name: string;
	instances: () => DirectiveInstance<T>[];
	create: (state: T) => Promise<DirectiveInstance<T>>;
	get: (id: string) => DirectiveInstance<T> | undefined;
	// Reports an instance when an edit removes a whole reference from a note;
	// see README.md#removal. Other copies may remain.
	// TODO: Index the vault's directive references so listeners can tell
	// whether the removed reference was the last one.
	onRemoved: (handler: DirectiveRemovedHandler<T>) => () => void;
};

type RegisteredDirectiveProps = { id: string; state: unknown };
export type RegisteredDirective = ComponentType<RegisteredDirectiveProps>;
