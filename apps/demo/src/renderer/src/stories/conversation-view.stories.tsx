import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConversationView } from '../pages/agent-chat/conversation/conversation-view.js';
import {
	emptyConversation,
	singleTurn,
	multiTurn,
	thinkingTurn,
} from './fixtures.js';

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
	args: { turns: singleTurn },
};

export const MultiTurn: Story = {
	args: { turns: multiTurn },
};

export const WithThinking: Story = {
	args: { turns: thinkingTurn },
};
