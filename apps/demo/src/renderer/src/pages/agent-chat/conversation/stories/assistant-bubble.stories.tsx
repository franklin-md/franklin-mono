import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssistantBubble } from '../turn/body/assistant-bubble.js';
import {
	assistantTextMessage,
	assistantThinkingMessage,
	assistantToolCallMessage,
	assistantMultiBlockMessage,
} from '../fixtures.js';

const meta = {
	title: 'Conversation/AssistantBubble',
	component: AssistantBubble,
} satisfies Meta<typeof AssistantBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextOnly: Story = {
	args: { message: assistantTextMessage },
};

export const WithThinking: Story = {
	args: { message: assistantThinkingMessage },
};

export const WithToolCall: Story = {
	args: { message: assistantToolCallMessage },
};

export const MultiBlock: Story = {
	args: { message: assistantMultiBlockMessage },
};
