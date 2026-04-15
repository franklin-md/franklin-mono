import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ThinkingLevel } from '@franklin/mini-acp';

import { MockAgentDecorator } from '../../storybook/mock-agent.js';
import { ThinkingToggle } from './thinking-toggle.js';

const levels: ThinkingLevel[] = ['off', 'low', 'medium', 'high', 'xhigh'];

const meta = {
	title: 'Conversation/ThinkingToggle',
	component: ThinkingToggle,
	decorators: [
		(Story) => (
			<MockAgentDecorator reasoning="medium">
				<Story />
			</MockAgentDecorator>
		),
	],
} satisfies Meta<typeof ThinkingToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StartAtHigh: Story = {
	decorators: [
		(Story) => (
			<MockAgentDecorator reasoning="high">
				<Story />
			</MockAgentDecorator>
		),
	],
};

export const Gallery: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			{levels.map((level) => (
				<MockAgentDecorator key={level} reasoning={level}>
					<ThinkingToggle />
				</MockAgentDecorator>
			))}
		</div>
	),
};
