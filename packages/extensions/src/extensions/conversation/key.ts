import { storeKey } from '../../api/store/key.js';
import type { ConversationTurn } from './types.js';

export const conversationKey = storeKey<'conversation', ConversationTurn[]>(
	'conversation',
);
