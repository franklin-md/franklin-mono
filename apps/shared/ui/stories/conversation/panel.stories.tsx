import type { Meta, StoryObj } from '@storybook/react-vite';

import { emptyConversation, multiTurn } from '../fixtures.js';
import { MockAgentDecorator } from '../mock-agent.js';
import { ConversationPanel } from '../../src/conversation/panel.js';

const meta = {
	title: 'Conversation/ConversationPanel',
	component: ConversationPanel,
	decorators: [
		(Story) => (
			<MockAgentDecorator turns={multiTurn}>
				<div className="flex h-[600px]">
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
				<div className="flex h-[600px]">
					<Story />
				</div>
			</MockAgentDecorator>
		),
	],
};
