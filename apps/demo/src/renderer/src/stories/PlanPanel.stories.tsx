import type { Meta, StoryObj } from '@storybook/react-vite';

import { PlanPanel } from '@/components/conversation/plan-panel';

const meta = {
	title: 'Conversation/PlanPanel',
	component: PlanPanel,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PlanPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
	args: {
		plan: {
			entries: [
				{
					content: 'Read the existing agent.ts file',
					status: 'completed',
					priority: 'medium',
				},
				{
					content: 'Refactor spawn logic to use async/await',
					status: 'completed',
					priority: 'high',
				},
				{
					content: 'Update middleware stack to pass async context',
					status: 'in_progress',
					priority: 'high',
				},
				{
					content: 'Add error handling for subprocess failures',
					status: 'pending',
					priority: 'medium',
				},
				{
					content: 'Run tests and fix any regressions',
					status: 'pending',
					priority: 'medium',
				},
			],
		},
	},
};

export const AllCompleted: Story = {
	args: {
		plan: {
			entries: [
				{
					content: 'Read the existing agent.ts file',
					status: 'completed',
					priority: 'medium',
				},
				{
					content: 'Refactor spawn logic to use async/await',
					status: 'completed',
					priority: 'high',
				},
				{
					content: 'Update middleware stack',
					status: 'completed',
					priority: 'high',
				},
				{ content: 'Run tests', status: 'completed', priority: 'medium' },
			],
		},
	},
};

export const JustStarted: Story = {
	args: {
		plan: {
			entries: [
				{
					content: 'Analyze codebase structure',
					status: 'in_progress',
					priority: 'high',
				},
				{
					content: 'Identify files to modify',
					status: 'pending',
					priority: 'medium',
				},
				{ content: 'Implement changes', status: 'pending', priority: 'medium' },
				{ content: 'Write tests', status: 'pending', priority: 'medium' },
			],
		},
	},
};
