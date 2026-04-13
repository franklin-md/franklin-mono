import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ThinkingLevel } from '@franklin/mini-acp';

import { ThinkingToggle } from '@franklin/ui';
import { MockAgentDecorator } from './mock-agent.js';

const LEVELS: ThinkingLevel[] = ['off', 'low', 'medium', 'high', 'xhigh'];

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

function AllLevelsGallery() {
	return (
		<div className="flex items-center gap-2">
			{LEVELS.map((level) => (
				<MockAgentDecorator key={level} reasoning={level}>
					<ThinkingToggle />
				</MockAgentDecorator>
			))}
		</div>
	);
}

export const Gallery: Story = {
	render: () => <AllLevelsGallery />,
};
