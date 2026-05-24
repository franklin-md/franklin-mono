import type { Context, ToolDefinition } from '@franklin/mini-acp';
import { copyContext } from '../copy.js';
import type { ContextField, ContextRevisions } from '../fields.js';
import type { SessionCommit } from './types.js';

export class DraftContext {
	constructor(
		private readonly context: Context,
		private readonly revisions: ContextRevisions,
	) {}

	setSystemPrompt(systemPrompt: string, revision: string): void {
		this.context.systemPrompt = systemPrompt;
		this.setRevision('systemPrompt', revision);
	}

	setTools(tools: readonly ToolDefinition[], revision: string): void {
		this.context.tools = [...tools];
		this.setRevision('tools', revision);
	}

	commit(): SessionCommit {
		return {
			context: copyContext(this.context),
			revisions: { ...this.revisions },
		};
	}

	private setRevision(field: ContextField, revision: string): void {
		if (this.revisions[field] === revision) return;
		this.revisions[field] = revision;
	}
}
