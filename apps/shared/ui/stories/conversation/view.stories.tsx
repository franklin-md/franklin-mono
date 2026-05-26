import type { Meta, StoryObj } from '@storybook/react-vite';
import { createToolUseBlock } from '@franklin/react';

import {
	emptyConversation,
	markdownConversation,
	multiTurn,
	singleTurnSequence,
	thinkingStreamingTurnSequence,
	thinkingTurnSequence,
	toolStateConversation,
} from '../fixtures.js';
import { ToolCardChrome } from '../../src/conversation/tools/chrome.js';
import { defaultToolRegistry } from '../../src/conversation/tools/registry/index.js';
import { ConversationView } from '../../src/conversation/view.js';

const ToolUse = createToolUseBlock(defaultToolRegistry, ToolCardChrome);

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

export const ToolStates: Story = {
	args: {
		turns: toolStateConversation,
		components: { ToolUse },
	},
};

export const WithThinking: Story = {
	args: { turns: thinkingTurnSequence },
};

export const WithThinkingStreaming: Story = {
	args: { turns: thinkingStreamingTurnSequence },
};

export const RichMarkdown: Story = {
	args: { turns: markdownConversation },
};
