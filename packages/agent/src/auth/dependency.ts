import type {
	DependencyModule,
	DependencyRuntime,
} from '@franklin/extensibility/module';

import type { AuthManager } from './manager.js';

export type AuthDependencyRuntime = DependencyRuntime<'auth', AuthManager>;
export type AuthDependencyModule = DependencyModule<'auth', AuthManager>;
