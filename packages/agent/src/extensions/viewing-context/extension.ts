import { defineExtension } from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { formatViewingContext } from './format.js';
import { viewingContextKey } from './key.js';
import type { ViewingContextState } from './types.js';

const instructions = `When the prompt includes resources the user is currently viewing, treat that list as lightweight UI context.
  If a viewed resource could be relevant to the user request, consider using an available reading tool to inspect it before answering.`;

const initialViewingContextState: ViewingContextState = {
	enabled: true,
	references: [],
};

export function viewingContextExtension() {
	return defineExtension<[CoreModule, StoreModule]>((api) => {
		api.registerStore(viewingContextKey, initialViewingContextState, 'private');

		api.on('systemPrompt', (systemPrompt) => {
			systemPrompt.setPart(instructions, { once: true });
		});

		api.on('prompt', (prompt, ctx) => {
			const state = ctx.getStore(viewingContextKey).get();
			if (!state.enabled) return;

			const formatted = formatViewingContext(state.references);
			if (formatted === undefined) return;

			prompt.appendContent({ type: 'text', text: formatted });
		});
	});
}
