export const MAX_CONVERSATION_TITLE_LENGTH = 80;

export type ConversationTitle = string;

export interface ConversationTitleControl {
	setTitle: (title: string) => ConversationTitle;
	title: () => ConversationTitle;
}
