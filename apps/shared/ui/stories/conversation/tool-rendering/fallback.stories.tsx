import type { Meta, StoryObj } from '@storybook/react-vite';
import { conversationTitleExtension } from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const meta = {
	title: 'Conversation/Tool Rendering/Fallback',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SetChatTitle: Story = {
	args: {
		title: 'set_chat_title',
		toolName: conversationTitleExtension.tools.setChatTitle.name,
		args: { title: 'Tool rendering review' },
		successResultText: 'Set conversation title.',
		errorResultText: 'Could not set title.',
	},
};

export const UnknownTool: Story = {
	args: {
		title: 'unknown_tool',
		toolName: 'unknown_tool',
		args: { value: 'fallback renderer' },
		successResultText: 'Unknown tool completed.',
		errorResultText: 'Unknown tool failed.',
	},
};
