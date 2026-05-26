import type { UserContent } from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ReferencesEngine } from '../engine.js';

type MaybePromise<T> = T | Promise<T>;

export type Reference = {
	readonly type: string;
	readonly locator: string;
	readonly selector?: string;
	readonly label?: string;
};

export type ReferenceContext = {
	readonly content: UserContent[];
};

export type ReferenceHandlerRuntime = BaseRuntime & {
	readonly references: ReferencesEngine;
};

export type ReferenceHandler<
	Runtime extends ReferenceHandlerRuntime = ReferenceHandlerRuntime,
> = {
	readonly type: string;
	toContext(reference: Reference, ctx: Runtime): MaybePromise<ReferenceContext>;
};
