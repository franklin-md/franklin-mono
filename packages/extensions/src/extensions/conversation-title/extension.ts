import { defineExtension } from '../../algebra/extension/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { createControl } from './control.js';
import { conversationTitleKey } from './key.js';
import { setChatTitleSpec } from './tools.js';

export function conversationTitleExtension() {
	return defineExtension<[CoreModule, StoreModule]>((api) => {
		api.registerStore(conversationTitleKey, '', 'private');

		api.on('systemPrompt', (systemPrompt) => {
			systemPrompt.setPart(
				`After the first meaningful user request in a new chat, choose a concise title and call \`${setChatTitleSpec.name}\` with that title. Use the tool once per chat unless the user explicitly asks to rename it.`,
				{ once: true },
			);
		});

		// TODO(FRA-326): disable tool after first use once the mechanism is supported.
		api.registerTool(setChatTitleSpec, ({ title }, ctx) => {
			const control = createControl(ctx.getStore(conversationTitleKey));
			const nextTitle = control.setTitle(title);
			return `Title set to "${nextTitle}"`;
		});
	});
}
