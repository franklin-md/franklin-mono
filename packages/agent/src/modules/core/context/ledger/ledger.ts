import type {
	Context,
	ContextPatch,
	Message,
	MiniACPClient,
} from '@franklin/mini-acp';
import {
	ContextTracker,
	type ContextRecorder,
} from '@franklin/mini-acp/session';
import {
	contextFields,
	fieldsInPatch,
	isEmptyPatch,
	type ContextField,
	type ContextRevisions,
} from '../fields.js';
import type { SessionDraft } from '../draft/index.js';
import { copyContext, copyContextPatch } from '../copy.js';

type ContextLedgerState = {
	readonly draft: SessionDraft;
	readonly sent: ContextTracker;
	sentRevisions: Partial<ContextRevisions>;
	hasSentInitialContext: boolean;
};

type CreateContextLedgerInput = {
	readonly draft: SessionDraft;
};

type ContextLedgerParts = {
	readonly ledger: ContextLedger;
	readonly recorder: ContextRecorder;
	readonly getSentContext: () => Context;
};

export class ContextLedger {
	static create({ draft }: CreateContextLedgerInput): ContextLedgerParts {
		const ledger = new ContextLedger({
			draft,
			sent: new ContextTracker(),
			sentRevisions: {},
			hasSentInitialContext: false,
		});

		return {
			ledger,
			recorder: ledger.createRecorder(),
			getSentContext: () => ledger.getSentContext(),
		};
	}

	private constructor(private readonly state: ContextLedgerState) {}

	getDraft(): Context {
		return this.state.draft.get();
	}

	async sync(client: MiniACPClient): Promise<void> {
		const commit = await this.state.draft.commit();
		const patch = this.planPatch(commit.context, commit.revisions);
		if (isEmptyPatch(patch)) return;

		await client.setContext(patch);
		this.recordSent(patch, commit.revisions, true);
	}

	private createRecorder(): ContextRecorder {
		return {
			apply: (patch) => this.recordPatch(patch),
			append: (message) => this.recordMessage(message),
		};
	}

	private getSentContext(): Context {
		return copyContext(this.state.sent.get());
	}

	private recordPatch(patch: ContextPatch): void {
		this.state.draft.apply(patch);
		this.recordSent(patch, this.currentDraftRevisions(), false);
	}

	private recordMessage(message: Message): void {
		this.state.draft.append(message);
		this.state.sent.append(message);
		this.state.sentRevisions.messages = this.state.draft.revision('messages');
	}

	private planPatch(
		context: Context,
		revisions: ContextRevisions,
	): ContextPatch {
		if (!this.state.hasSentInitialContext) {
			return copyContext(context);
		}

		const patch: ContextPatch = {};
		for (const field of contextFields) {
			if (this.state.sentRevisions[field] === revisions[field]) continue;
			this.patchField(patch, field, context);
		}
		return patch;
	}

	private recordSent(
		patch: ContextPatch,
		revisions: ContextRevisions,
		marksInitialContext: boolean,
	): void {
		// A sent patch is copied before recording so caller-owned arrays/config
		// objects cannot mutate the ledger's view of what Mini-ACP has received.
		this.state.sent.apply(copyContextPatch(patch));
		for (const field of fieldsInPatch(patch)) {
			this.state.sentRevisions[field] = revisions[field];
		}
		if (marksInitialContext && this.isFullContextPatch(patch)) {
			this.state.hasSentInitialContext = true;
		}
	}

	private currentDraftRevisions(): ContextRevisions {
		return {
			systemPrompt: this.state.draft.revision('systemPrompt'),
			messages: this.state.draft.revision('messages'),
			tools: this.state.draft.revision('tools'),
			config: this.state.draft.revision('config'),
		};
	}

	private patchField(
		patch: ContextPatch,
		field: ContextField,
		context: Context,
	): void {
		switch (field) {
			case 'systemPrompt':
				patch.systemPrompt = context.systemPrompt;
				break;
			case 'messages':
				patch.messages = [...context.messages];
				break;
			case 'tools':
				patch.tools = [...context.tools];
				break;
			case 'config':
				patch.config = { ...context.config };
				break;
		}
	}

	private isFullContextPatch(patch: ContextPatch): boolean {
		return contextFields.every((field) => patch[field] !== undefined);
	}
}
