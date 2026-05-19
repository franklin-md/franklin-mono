import {
	createDependencyModule,
	type DependencyModule,
} from '@franklin/extensibility/module';
import type { InferRuntime } from '@franklin/extensibility/module';

type Self = {
	readonly id: string;
};

export type SelfModule = DependencyModule<'self', Self>;
export type SelfRuntime = InferRuntime<SelfModule>;

// TODO: Consider maybe just having htis be a idModule and attach id directly instead of in an object.
export function createSelfModule(id: string): SelfModule {
	const self: Self = { id };
	return createDependencyModule('self', self);
}
