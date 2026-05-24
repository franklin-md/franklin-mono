import type { CoreRegistry } from '../../registrations/index.js';
import type { SessionSnapshot } from '../../state.js';
import type { ToolRegistry } from '../../tools/index.js';
import { createSystemPromptBuilder } from '../system-prompt/index.js';
import { SessionDraft } from './session.js';
import { createSystemPromptDrafter } from './system-prompt.js';
import { createToolDefinitionDrafter } from './tools.js';

type CreateSessionDraftInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolRegistry;
};

export function createSessionDraft({
	snapshot,
	registrations,
	toolRegistry,
}: CreateSessionDraftInput): SessionDraft {
	const systemPrompt = createSystemPromptBuilder({
		registrations,
	});
	const draft = SessionDraft.fromSnapshot(snapshot);
	draft.addDrafter(createSystemPromptDrafter(systemPrompt));
	draft.addDrafter(createToolDefinitionDrafter(toolRegistry));
	return draft;
}
