import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, GitBranch } from 'lucide-react';

import { MockAgentsDecorator } from '../mock-agent.js';
import { ForkButton } from '../../src/agent-selector/fork-button.js';

const meta = {
	title: 'AgentSelector/ForkButton',
	component: ForkButton,
	decorators: [
		(Story) => (
			<MockAgentsDecorator activeSessionId="mock-session">
				<Story />
			</MockAgentsDecorator>
		),
	],
} satisfies Meta<typeof ForkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
	decorators: [
		(Story) => (
			<MockAgentsDecorator activeSessionId={null}>
				<Story />
			</MockAgentsDecorator>
		),
	],
};

export const CustomIconGitBranch: Story = {
	args: {
		icon: GitBranch,
	},
};

export const CustomIconCopy: Story = {
	args: {
		icon: Copy,
	},
};
