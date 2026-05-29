import type { UserContent } from '@franklin/mini-acp';
import type { BaseRuntime, WithRuntime } from '@franklin/extensibility';
import type { ReferencesEngine } from '../engine.js';

type MaybePromise<T> = T | Promise<T>;

export type Reference = {
	/**
	 * Stable origin identity for the referenced resource.
	 *
	 * Providers may resolve this to local paths, downloaded bytes, or cached
	 * artifacts, but delegation should preserve the original locator unless the
	 * user-facing identity really changes.
	 */
	readonly locator: string;
	/**
	 * Provider-local selection string, such as pages, lines, or ranges.
	 */
	readonly selector?: string;
	/**
	 * Optional display alias for UI and rendered context labels.
	 *
	 * This is not part of reference identity or cache identity.
	 */
	readonly label?: string;
};

export type ReferenceContext = {
	readonly content: UserContent[];
	readonly isError?: boolean;
};

export type ResolvedData = {
	readonly type: 'bytes';
	readonly bytes: Uint8Array;
	readonly mime?: string;
};

export type ResolvedReference = Reference & {
	/**
	 * Intermediate materialized state passed between delegated handlers.
	 *
	 * Data is not part of the public request shape and should not replace
	 * `locator` as the source identity for the reference.
	 */
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
