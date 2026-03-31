import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { PromptInput } from './prompt-input.js';

const meta = {
	title: 'Conversation/PromptInput',
	component: PromptInput,
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onSend: fn(),
		sending: false,
	},
};

export const Sending: Story = {
	args: {
		onSend: fn(),
		sending: true,
	},
};
