import type { Meta, StoryObj } from '@storybook/react-vite';

import { ThoughtBlock } from '@/components/conversation/thought-block';

const meta = {
	title: 'Conversation/ThoughtBlock',
	component: ThoughtBlock,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ThoughtBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
	args: {
		thought: {
			id: 't1',
			text: 'The user wants to refactor this function. I should first understand the current implementation, then identify the callback patterns that can be converted to async/await.',
			isStreaming: false,
		},
	},
};

export const Streaming: Story = {
	args: {
		thought: {
			id: 't2',
			text: 'Let me think about the best approach to restructure this module. The current architecture uses',
			isStreaming: true,
		},
	},
};
