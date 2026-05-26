import type { UserContent } from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensions';

type MaybePromise<T> = T | Promise<T>;

export type Reference = {
	readonly type: string;
	readonly locator: unknown;
	readonly selector?: unknown;
	readonly label?: string;
};

export type ReferenceContext = {
	readonly content: UserContent[];
};

export type ReferenceEngine = {
	toContext(reference: Reference): Promise<ReferenceContext>;
};

export type ReferenceHandlerRuntime = BaseRuntime & {
	readonly references: ReferenceEngine;
};

export type ReferenceHandler<
	Runtime extends ReferenceHandlerRuntime = ReferenceHandlerRuntime,
> = {
	readonly type: string;
	toContext(reference: Reference, ctx: Runtime): MaybePromise<ReferenceContext>;
};
