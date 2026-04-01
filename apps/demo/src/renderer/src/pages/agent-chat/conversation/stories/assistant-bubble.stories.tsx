import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssistantBubble } from '../turn/body/assistant-bubble.js';
import {
	assistantTextResponse,
	assistantThinkingResponse,
	assistantToolCallResponse,
	assistantMultiBlockResponse,
	assistantMarkdownResponse,
	assistantCodeBlockResponse,
	assistantMathResponse,
	assistantKitchenSinkResponse,
} from '../fixtures.js';

const meta = {
	title: 'Conversation/AssistantBubble',
	component: AssistantBubble,
} satisfies Meta<typeof AssistantBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextOnly: Story = {
	args: { response: assistantTextResponse },
};

export const WithThinking: Story = {
	args: { response: assistantThinkingResponse },
};

export const WithToolCall: Story = {
	args: { response: assistantToolCallResponse },
};

export const MultiBlock: Story = {
	args: { response: assistantMultiBlockResponse },
};

export const Markdown: Story = {
	args: { response: assistantMarkdownResponse },
};

export const CodeBlocks: Story = {
	args: { response: assistantCodeBlockResponse },
};

export const MathExpressions: Story = {
	args: { response: assistantMathResponse },
};

export const KitchenSink: Story = {
	args: { response: assistantKitchenSinkResponse },
};
