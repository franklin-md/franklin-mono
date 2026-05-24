import type { Context, ContextPatch, Message } from '@franklin/mini-acp';
import { ContextTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../../state.js';
import {
	contextFields,
	fieldsInPatch,
	type ContextField,
	type ContextRevisions,
} from '../fields.js';
import { DraftContext } from './context.js';
import { copyContext } from './copy.js';
import type { SessionCommit, SessionDrafter } from './types.js';

export class SessionDraft {
	private readonly tracker = new ContextTracker();
	private readonly revisions = initialRevisions();
	private readonly drafters: SessionDrafter[] = [];

	static fromSnapshot(snapshot: SessionSnapshot): SessionDraft {
		const draft = new SessionDraft();
		draft.tracker.apply({
			messages: snapshot.messages,
			config: snapshot.llmConfig,
		});
		return draft;
	}

	addDrafter(drafter: SessionDrafter): void {
		this.drafters.push(drafter);
	}

	apply(patch: ContextPatch): void {
		this.tracker.apply(patch);
		this.bumpFields(fieldsInPatch(patch));
	}

	append(message: Message): void {
		this.tracker.append(message);
		this.bump('messages');
	}

	reset(): void {
		this.tracker.reset();
		this.bumpFields(contextFields);
	}

	get(): Context {
		return copyContext(this.tracker.get());
	}

	revision(field: ContextField): string {
		return revisionStamp(field, this.revisions[field]);
	}

	async commit(): Promise<SessionCommit> {
		const context = new DraftContext(
			copyContext(this.tracker.get()),
			currentRevisions(this.revisions),
		);

		for (const drafter of this.drafters) {
			await drafter(context);
		}

		return context.commit();
	}

	private bump(field: ContextField): void {
		this.revisions[field] += 1;
	}

	private bumpFields(fields: readonly ContextField[]): void {
		for (const field of fields) {
			this.bump(field);
		}
	}
}

function initialRevisions(): Record<ContextField, number> {
	return {
		systemPrompt: 1,
		messages: 1,
		tools: 1,
		config: 1,
	};
}

function currentRevisions(
	revisions: Record<ContextField, number>,
): ContextRevisions {
	return {
		systemPrompt: revisionStamp('systemPrompt', revisions.systemPrompt),
		messages: revisionStamp('messages', revisions.messages),
		tools: revisionStamp('tools', revisions.tools),
		config: revisionStamp('config', revisions.config),
	};
}

function revisionStamp(field: ContextField, revision: number): string {
	return `draft:${field}:${revision}`;
}
