import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button.js';

const meta = {
	title: 'Primitives/Button',
	component: Button,
	args: {
		children: 'Run build',
		variant: 'default',
		size: 'default',
	},
	argTypes: {
		variant: {
			control: 'select',
			options: [
				'default',
				'destructive',
				'outline',
				'secondary',
				'ghost',
				'link',
			],
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Destructive: Story = {
	args: {
		children: 'Delete agent',
		variant: 'destructive',
	},
};

export const Outline: Story = {
	args: {
		children: 'Open settings',
		variant: 'outline',
	},
};

export const Icon: Story = {
	args: {
		children: 'K',
		size: 'icon',
	},
};
