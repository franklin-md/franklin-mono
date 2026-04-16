import { storeKey } from '../../systems/store/api/key.js';
import type { ConversationTurn } from './types.js';

export const conversationKey = storeKey<'conversation', ConversationTurn[]>(
	'conversation',
);
