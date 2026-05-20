import { defineExtension } from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { StoreModule } from '../../modules/store/index.js';
import { createControl } from './control.js';
import { conversationTitleKey } from './key.js';
import { setChatTitleSpec } from './tools.js';

const instructions = `After the first user request in a new chat, you MUST set a concise chat title using \`${setChatTitleSpec.name}\`.`;

export function conversationTitleExtension() {
	return defineExtension<[CoreModule, StoreModule]>((api) => {
		api.registerStore(conversationTitleKey, '', 'private');

		// TODO: This really should not be a system prompt if its going to be disabled
		api.on('systemPrompt', (systemPrompt) => {
			systemPrompt.setPart(instructions, { once: true });
		});

		// TODO(FRA-326): disable tool after first use once the mechanism is supported.
		api.registerTool(setChatTitleSpec, ({ title }, ctx) => {
			const control = createControl(ctx.getStore(conversationTitleKey));
			const nextTitle = control.setTitle(title);
			return `Title set to "${nextTitle}"`;
		});
	});
}
