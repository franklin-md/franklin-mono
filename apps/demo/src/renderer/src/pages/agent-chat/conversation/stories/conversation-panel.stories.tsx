import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConversationPanel } from '../conversation-panel.js';
import { emptyConversation, multiTurn } from '../fixtures.js';
import { MockAgentDecorator } from './mock-agent.js';

const meta = {
	title: 'Conversation/ConversationPanel',
	component: ConversationPanel,
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={multiTurn}>
				<div style={{ height: '600px', display: 'flex' }}>
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
} satisfies Meta<typeof ConversationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={emptyConversation}>
				<div style={{ height: '600px', display: 'flex' }}>
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
};
