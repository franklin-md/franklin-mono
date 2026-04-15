import type { Meta, StoryObj } from '@storybook/react-vite';

import { userTextPrompt } from '../../fixtures.js';
import { UserBubble } from '../../../src/conversation/turn/user-bubble.js';

const meta = {
	title: 'Conversation/UserBubble',
	component: UserBubble,
} satisfies Meta<typeof UserBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { message: userTextPrompt },
};

export const LongMessage: Story = {
	args: {
		message: {
			role: 'user',
			content: [
				{
					type: 'text',
					text: 'This is a much longer message that demonstrates wrapping within the bubble, including enough content to hit the component width constraints and show the default spacing.',
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
