import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ConversationTurn } from '@franklin/extensions';

import { ConversationView } from '../../../src/conversation/view.js';

const waitingTurn = (id: string, agoMs: number): ConversationTurn => ({
	id,
	timestamp: Date.now() - agoMs,
	prompt: {
		role: 'user',
		content: [{ type: 'text', text: 'Working on it…' }],
	},
	response: { blocks: [] },
});

const meta = {
	title: 'Conversation/Waiting',
	component: ConversationView,
} satisfies Meta<typeof ConversationView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JustStarted: Story = {
	args: { turns: [waitingTurn('w-0', 0)] },
};

export const FiveSeconds: Story = {
	args: { turns: [waitingTurn('w-5s', 5_000)] },
};

export const OverAMinute: Story = {
	args: { turns: [waitingTurn('w-83s', 83_000)] },
};

export const OverAnHour: Story = {
	args: { turns: [waitingTurn('w-1h', 3_600_000 + 2 * 60_000 + 34_000)] },
};
