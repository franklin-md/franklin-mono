import { createBundle } from '../../algebra/bundle/create.js';
import { conversationExtension as buildConversationExtension } from './extension.js';
import { conversationKey } from './key.js';

export const conversationExtension = createBundle({
	extension: buildConversationExtension(),
	keys: { conversation: conversationKey },
	tools: {},
});
