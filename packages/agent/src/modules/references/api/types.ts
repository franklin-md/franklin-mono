import type { UserContent } from '@franklin/mini-acp';
import type { BaseRuntime, WithRuntime } from '@franklin/extensibility';
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

export type ResolvedData = {
	readonly type: 'bytes';
	readonly bytes: Uint8Array;
	readonly mime?: string;
};

export type ResolvedReference = Reference & {
	readonly data?: ResolvedData;
};

export type ReferenceDelegate = (
	reference: ResolvedReference,
) => Promise<ReferenceContext>;

export type ReferenceHandlerRuntime = BaseRuntime & {
	readonly references: ReferencesEngine;
};

export type ReferenceHandlerCallback = (
	reference: ResolvedReference,
	delegate: ReferenceDelegate,
) => MaybePromise<ReferenceContext>;

export type ReferenceHandler<
	Runtime extends ReferenceHandlerRuntime = ReferenceHandlerRuntime,
> = {
	test(reference: ResolvedReference): boolean;
	toContext: WithRuntime<ReferenceHandlerCallback, Runtime>;
};
