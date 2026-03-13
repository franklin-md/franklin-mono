import type { Meta, StoryObj } from '@storybook/react-vite';

import { UsageBar } from '@/components/conversation/usage-bar';

const meta = {
	title: 'Conversation/UsageBar',
	component: UsageBar,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof UsageBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LowUsage: Story = {
	args: {
		usage: {
			used: 12_450,
			size: 200_000,
			cost: { amount: 0.0234, currency: '$' },
		},
	},
};

export const MediumUsage: Story = {
	args: {
		usage: {
			used: 98_000,
			size: 200_000,
			cost: { amount: 0.1847, currency: '$' },
		},
	},
};

export const HighUsage: Story = {
	args: {
		usage: {
			used: 178_000,
			size: 200_000,
			cost: { amount: 0.3421, currency: '$' },
		},
	},
};

export const NoCost: Story = {
	args: {
		usage: {
			used: 50_000,
			size: 200_000,
		},
	},
};
