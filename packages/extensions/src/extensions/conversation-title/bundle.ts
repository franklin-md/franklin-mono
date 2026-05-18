import { createBundle } from '../../modules/bundle/index.js';
import { conversationTitleExtension as buildConversationTitleExtension } from './extension.js';
import { conversationTitleKey } from './key.js';
import { setChatTitleSpec } from './tools.js';

export const conversationTitleExtension = createBundle({
	extension: buildConversationTitleExtension(),
	keys: { title: conversationTitleKey },
	tools: { setChatTitle: setChatTitleSpec },
});
