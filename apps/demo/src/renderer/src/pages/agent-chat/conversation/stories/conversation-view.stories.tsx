import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConversationView } from '../view/conversation-view.js';
import {
	emptyConversation,
	singleTurnSequence,
	multiTurn,
	thinkingTurnSequence,
	markdownConversation,
} from '../fixtures.js';

const meta = {
	title: 'Conversation/ConversationView',
	component: ConversationView,
} satisfies Meta<typeof ConversationView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: { turns: emptyConversation },
};

export const SingleTurn: Story = {
	args: { turns: singleTurnSequence },
};

export const MultiTurn: Story = {
	args: { turns: multiTurn },
};

export const WithThinking: Story = {
	args: { turns: thinkingTurnSequence },
};

export const RichMarkdown: Story = {
	args: { turns: markdownConversation },
};
