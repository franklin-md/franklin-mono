import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssistantBubble } from '../turn/body/assistant-bubble.js';
import {
	assistantTextMessage,
	assistantThinkingMessage,
	assistantToolCallMessage,
	assistantMultiBlockMessage,
	assistantMarkdownMessage,
	assistantCodeBlockMessage,
	assistantMathMessage,
	assistantKitchenSinkMessage,
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

export const Markdown: Story = {
	args: { message: assistantMarkdownMessage },
};

export const CodeBlocks: Story = {
	args: { message: assistantCodeBlockMessage },
};

export const MathExpressions: Story = {
	args: { message: assistantMathMessage },
};

export const KitchenSink: Story = {
	args: { message: assistantKitchenSinkMessage },
};
