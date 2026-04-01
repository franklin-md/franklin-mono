import type { Meta, StoryObj } from '@storybook/react-vite';

import { Turn } from '../turn/turn.js';
import { simpleTurn, thinkingTurn, toolCallTurn } from '../fixtures.js';

const meta = {
	title: 'Conversation/Turn',
	component: Turn,
} satisfies Meta<typeof Turn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleExchange: Story = {
	args: { turn: simpleTurn },
};

export const WithThinking: Story = {
	args: { turn: thinkingTurn },
};

export const WithToolCalls: Story = {
	args: { turn: toolCallTurn },
};
