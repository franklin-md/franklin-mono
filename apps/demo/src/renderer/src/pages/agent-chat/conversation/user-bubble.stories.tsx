import type { Meta, StoryObj } from '@storybook/react-vite';

import { UserBubble } from './user-bubble.js';
import { userTextMessage } from './fixtures.js';

const meta = {
	title: 'Conversation/UserBubble',
	component: UserBubble,
} satisfies Meta<typeof UserBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { message: userTextMessage },
};

export const LongMessage: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: 'This is a much longer message that should demonstrate how the bubble handles wrapping. It contains enough text to ensure that the max-width constraint kicks in and the text wraps to multiple lines within the bubble component.',
				},
			],
		},
	},
};

export const MultipleTextBlocks: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{ type: 'text', text: 'First block. ' },
				{ type: 'text', text: 'Second block.' },
			],
		},
	},
};
