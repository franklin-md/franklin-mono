import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	cancelledTurn,
	configErrorTurn,
	finishedTurn,
	genericErrorTurn,
	maxTokensTurn,
	providerErrorTurn,
} from '../fixtures.js';
import { ConversationView } from '../../src/conversation/view.js';

const meta = {
	title: 'Conversation/TurnEnd',
	component: ConversationView,
} satisfies Meta<typeof ConversationView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finished: Story = {
	args: { turns: [finishedTurn] },
};

export const Cancelled: Story = {
	args: { turns: [cancelledTurn] },
};

export const MaxTokens: Story = {
	args: { turns: [maxTokensTurn] },
};

export const ConfigError: Story = {
	args: { turns: [configErrorTurn] },
};

export const ProviderError: Story = {
	args: { turns: [providerErrorTurn] },
};

export const GenericError: Story = {
	args: { turns: [genericErrorTurn] },
};
