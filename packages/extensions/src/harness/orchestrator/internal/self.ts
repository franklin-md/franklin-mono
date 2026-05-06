import {
	createDependencyModule,
	type DependencyModule,
} from '../../../modules/dependency/module.js';
import type { InferRuntime } from '../../modules/index.js';

type Self = {
	readonly id: string;
};

export type SelfModule = DependencyModule<'self', Self>;
// I think this is dead code
export type SelfRuntime = InferRuntime<SelfModule>;

// TODO: Consider maybe just having htis be a idModule and attach id directly instead of in an object.
export function createSelfModule(id: string): SelfModule {
	const self: Self = { id };
	return createDependencyModule('self', self);
}
