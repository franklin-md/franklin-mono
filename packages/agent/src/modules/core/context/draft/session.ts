import type { Context, ContextPatch, Message } from '@franklin/mini-acp';
import { ContextTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../../state.js';
import type { CompactionEntry, SessionEntry } from '../../history/types.js';
import { projectEntries } from '../../history/project.js';
import {
	fieldsInPatch,
	type ContextField,
	type ContextRevisions,
} from '../fields.js';
import { copyContext } from '../copy.js';
import { DraftContext } from './context.js';
import type { SessionCommit, SessionDrafter } from './types.js';

export class SessionDraft {
	private entries: SessionEntry[] = [];
	private readonly tracker = new ContextTracker();
	private readonly revisions = initialRevisions();
	private readonly drafters: SessionDrafter[] = [];

	static fromSnapshot(snapshot: SessionSnapshot): SessionDraft {
		const draft = new SessionDraft();
		draft.entries = structuredClone(snapshot.entries);
		draft.tracker.apply({
			messages: projectEntries(draft.entries),
			config: snapshot.llmConfig,
		});
		return draft;
	}

	addDrafter(drafter: SessionDrafter): void {
		this.drafters.push(drafter);
	}

	apply(patch: ContextPatch): void {
		// An explicit messages patch resets history, matching Mini-ACP replacement
		// semantics. Ordinary ledger synchronization must never call apply(): its
		// projected messages are only recorded in the sent-context tracker.
		if (patch.messages !== undefined) {
			this.entries = structuredClone(patch.messages).map((message) => ({
				type: 'message',
				message,
			}));
		}
		this.tracker.apply(patch);
		this.bumpFields(fieldsInPatch(patch));
	}

	append(message: Message): void {
		this.entries.push({ type: 'message', message: structuredClone(message) });
		this.tracker.append(message);
		this.bump('messages');
	}

	getEntries(): SessionEntry[] {
		return structuredClone(this.entries);
	}

	appendCheckpoint(entry: CompactionEntry): void {
		const entries = [...this.entries, structuredClone(entry)];
		// Validate the complete reduction before changing either durable history or
		// desired context, so a rejected checkpoint leaves both intact.
		const messages = projectEntries(entries);
		this.tracker.apply({ messages });
		this.entries = entries;
		this.bump('messages');
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
