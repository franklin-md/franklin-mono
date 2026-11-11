import type { Store } from '@franklin/agent';
import type { ComponentType } from 'react';
import type { DirectiveInstance } from './instance.js';

export type DirectiveProps<T> = {
	id: string;
	state: T;
	update: (recipe: Parameters<Store<T>['set']>[0]) => Promise<void>;
};

export type DirectiveDefinition<T> = {
	name: string;
	instances: () => DirectiveInstance<T>[];
	create: (state: T) => Promise<DirectiveInstance<T>>;
	get: (id: string) => DirectiveInstance<T> | undefined;
};

type RegisteredDirectiveProps = { id: string };
export type RegisteredDirective = ComponentType<RegisteredDirectiveProps>;
