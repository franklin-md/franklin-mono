import type {
	Context,
	ContextPatch,
	Message,
	MiniACPClient,
	Usage,
} from '@franklin/mini-acp';
import {
	ContextTracker,
	type ContextRecorder,
} from '@franklin/mini-acp/session';
import type { SessionSnapshot, ToolFilter } from '../state.js';
import type { SessionDraft } from './session-draft.js';
import { pickLLMConfig } from './session-draft.js';
import {
	contextFields,
	fieldsInPatch,
	type ContextField,
	type ContextRevisions,
} from './context-fields.js';

export interface ToolFilterProvider {
	filter(): ToolFilter;
}

type ContextLedgerInput = {
	readonly draft: SessionDraft;
	readonly toolRegistry: ToolFilterProvider;
};

export class ContextLedger implements ContextRecorder {
	private readonly draft: SessionDraft;
	private readonly sent = new ContextTracker();
	private readonly toolRegistry: ToolFilterProvider;
	private sentRevisions: Partial<ContextRevisions> = {};
	private hasSentInitialContext = false;
	private sendingPatch: ContextPatch | undefined;

	onChange?: () => void;

	constructor({ draft, toolRegistry }: ContextLedgerInput) {
		this.draft = draft;
		this.toolRegistry = toolRegistry;
	}

	get(): Context {
		return this.sent.get();
	}

	apply(patch: ContextPatch): void {
		if (this.sendingPatch === patch) return;

		this.draft.apply(patch);
		this.recordSent(patch, currentDraftRevisions(this.draft), false);
		this.onChange?.();
	}

	append(message: Message): void {
		this.draft.append(message);
		this.sent.append(message);
		this.sentRevisions.messages = this.draft.revision('messages');
		this.onChange?.();
	}

	reset(): void {
		this.draft.reset();
		this.sent.reset();
		this.sentRevisions = {};
		this.hasSentInitialContext = false;
		this.sendingPatch = undefined;
		this.onChange?.();
	}

	getSnapshot(usage: Usage): SessionSnapshot {
		const context = this.draft.get();
		return sessionSnapshot(
			context.messages,
			pickLLMConfig(context.config),
			usage,
			this.toolRegistry.filter(),
		);
	}

	async sync(client: MiniACPClient): Promise<void> {
		const commit = await this.draft.commit();
		const patch = this.planPatch(commit.context, commit.revisions);
		if (isEmptyPatch(patch)) return;

		this.sendingPatch = patch;
		try {
			await client.setContext(patch);
		} finally {
			if (this.sendingPatch === patch) this.sendingPatch = undefined;
		}

		// Current policy: a successful setContext call means the agent now has
		// this patch. If Mini-ACP grows explicit acknowledgement/retry semantics,
		// split that policy out here instead of threading acknowledgement state
		// through the draft model.
		this.recordSent(patch, commit.revisions, true);
	}

	private planPatch(
		context: Context,
		revisions: ContextRevisions,
	): ContextPatch {
		if (!this.hasSentInitialContext) {
			return contextToPatch(context);
		}

		const patch: ContextPatch = {};
		for (const field of contextFields) {
			if (this.sentRevisions[field] === revisions[field]) continue;
			patchField(patch, field, context);
		}
		return patch;
	}

	private recordSent(
		patch: ContextPatch,
		revisions: ContextRevisions,
		marksInitialContext: boolean,
	): void {
		this.sent.apply(copyContextPatch(patch));
		for (const field of fieldsInPatch(patch)) {
			this.sentRevisions[field] = revisions[field];
		}
		if (marksInitialContext && isFullContextPatch(patch)) {
			this.hasSentInitialContext = true;
		}
	}
}

function currentDraftRevisions(draft: SessionDraft): ContextRevisions {
	return {
		systemPrompt: draft.revision('systemPrompt'),
		messages: draft.revision('messages'),
		tools: draft.revision('tools'),
		config: draft.revision('config'),
	};
}

function isEmptyPatch(patch: ContextPatch): boolean {
	return (
		patch.systemPrompt === undefined &&
		patch.messages === undefined &&
		patch.tools === undefined &&
		patch.config === undefined
	);
}

function contextToPatch(context: Context): ContextPatch {
	return {
		systemPrompt: context.systemPrompt,
		messages: [...context.messages],
		tools: [...context.tools],
		config: { ...context.config },
	};
}

function copyContextPatch(patch: ContextPatch): ContextPatch {
	const copy: ContextPatch = {};
	if (patch.systemPrompt !== undefined) copy.systemPrompt = patch.systemPrompt;
	if (patch.messages !== undefined) copy.messages = [...patch.messages];
	if (patch.tools !== undefined) copy.tools = [...patch.tools];
	if (patch.config !== undefined) copy.config = { ...patch.config };
	return copy;
}

function patchField(
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

function isFullContextPatch(patch: ContextPatch): boolean {
	return contextFields.every((field) => patch[field] !== undefined);
}

function sessionSnapshot(
	messages: readonly Message[],
	llmConfig: SessionSnapshot['llmConfig'],
	usage: Usage,
	toolFilter: ToolFilter,
): SessionSnapshot {
	return {
		messages: [...messages],
		llmConfig,
		usage: snapshotUsage(usage),
		toolFilter,
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: { ...usage.tokens },
		cost: { ...usage.cost },
	};
}
