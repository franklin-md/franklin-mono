import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	AnthropicLoginButton,
	OpenAICodexLoginButton,
} from '../../src/index.js';

const meta = {
	title: 'Auth/LoginProviderButton',
	component: AnthropicLoginButton,
	args: { providerName: 'Claude' },
} satisfies Meta<typeof AnthropicLoginButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Anthropic: Story = {};

export const OpenAICodex: Story = {
	render: () => <OpenAICodexLoginButton providerName="ChatGPT" />,
};

export const SignedIn: Story = {
	args: { isSignedIn: true },
};

export const Loading: Story = {
	args: { isLoading: true },
};

export const Both: Story = {
	render: () => (
		<div className="flex gap-2">
			<AnthropicLoginButton providerName="Claude" />
			<OpenAICodexLoginButton providerName="ChatGPT" />
		</div>
	),
};
