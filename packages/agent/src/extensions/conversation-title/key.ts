import { storeKey } from '../../modules/store/api/key.js';
import type { ConversationTitle } from './types.js';

export const conversationTitleKey = storeKey<
	'conversationTitle',
	ConversationTitle
>('conversationTitle');
