import type { Context } from '@franklin/mini-acp';
import type { MaybePromise } from '../../../../utils/maybe-promise.js';
import type { ContextRevisions } from '../fields.js';
import type { DraftContext } from './context.js';

export type SessionCommit = {
	readonly context: Context;
	readonly revisions: ContextRevisions;
};

export type SessionDrafter = (context: DraftContext) => MaybePromise<void>;
