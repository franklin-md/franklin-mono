import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ConversationPanel } from '../conversation-panel.js';
import { ConversationProvider } from '../conversation-context.js';
import { emptyConversation, multiTurn } from '../fixtures.js';

const meta = {
	title: 'Conversation/ConversationPanel',
	component: ConversationPanel,
	decorators: [
		(Story) => (
			<ConversationProvider
				value={{ turns: multiTurn, onSend: fn(), sending: false }}
			>
				<div style={{ height: '600px', display: 'flex' }}>
					<Story />
				</div>
			</ConversationProvider>
		),
	],
} satisfies Meta<typeof ConversationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	decorators: [
		(Story) => (
			<ConversationProvider
				value={{ turns: emptyConversation, onSend: fn(), sending: false }}
			>
				<div style={{ height: '600px', display: 'flex' }}>
					<Story />
				</div>
			</ConversationProvider>
		),
	],
};

export const Sending: Story = {
	decorators: [
		(Story) => (
			<ConversationProvider
				value={{ turns: multiTurn, onSend: fn(), sending: true }}
			>
				<div style={{ height: '600px', display: 'flex' }}>
					<Story />
				</div>
			</ConversationProvider>
		),
	],
};
