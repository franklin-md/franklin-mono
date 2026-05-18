import type { Store } from '../../modules/store/api/types.js';
import type { ConversationTitle, ConversationTitleControl } from './types.js';
import { MAX_CONVERSATION_TITLE_LENGTH } from './types.js';

export function createControl(
	titleStore: Store<ConversationTitle>,
): ConversationTitleControl {
	return {
		setTitle: (title: string) => {
			const trimmed = title.trim();
			if (trimmed.length === 0) {
				throw new Error('Conversation title cannot be empty');
			}
			if (trimmed.length > MAX_CONVERSATION_TITLE_LENGTH) {
				throw new Error(
					`Conversation title must be ${MAX_CONVERSATION_TITLE_LENGTH} characters or fewer`,
				);
			}

			titleStore.set(() => trimmed);
			return trimmed;
		},
		title: () => titleStore.get(),
	};
}
