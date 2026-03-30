import type { Meta, StoryObj } from '@storybook/react-vite';

import { Turn } from '../pages/agent-chat/conversation/turn.js';
import { singleTurn, thinkingTurn, multiTurn } from './fixtures.js';

const meta = {
	title: 'Conversation/Turn',
	component: Turn,
} satisfies Meta<typeof Turn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleExchange: Story = {
	args: { turn: singleTurn[0] },
};

export const WithThinking: Story = {
	args: { turn: thinkingTurn[0] },
};

export const WithToolCalls: Story = {
	args: { turn: multiTurn[2] },
};
