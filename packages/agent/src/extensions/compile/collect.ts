import type {
	ExtensionAPI,
	ExtensionToolDefinition,
	PromptHandler,
	SessionStartHandler,
	SessionUpdateHandler,
} from '../types/index.js';
import type { Extension } from '../types/index.js';

// ---------------------------------------------------------------------------
// Collected state — accumulated during extension.setup()
// ---------------------------------------------------------------------------

export interface CollectedState {
	sessionStartHandlers: SessionStartHandler[];
	promptHandlers: PromptHandler[];
	sessionUpdateHandlers: SessionUpdateHandler[];
	tools: ExtensionToolDefinition[];
}

// ---------------------------------------------------------------------------
// collect — run setup() and return accumulated state
// ---------------------------------------------------------------------------

export async function collect(extension: Extension): Promise<CollectedState> {
	const state: CollectedState = {
		sessionStartHandlers: [],
		promptHandlers: [],
		sessionUpdateHandlers: [],
		tools: [],
	};

	const api: ExtensionAPI = {
		on(event, handler) {
			switch (event) {
				case 'sessionStart':
					state.sessionStartHandlers.push(handler as SessionStartHandler);
					break;
				case 'prompt':
					state.promptHandlers.push(handler as PromptHandler);
					break;
				case 'sessionUpdate':
					state.sessionUpdateHandlers.push(handler as SessionUpdateHandler);
					break;
			}
		},

		registerTool(tool) {
			state.tools.push(tool);
		},
	};

	await extension.setup(api);
	return state;
}
