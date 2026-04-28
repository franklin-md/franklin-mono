import type { ComponentType } from 'react';

import { AnthropicLoginButton } from './anthropic.js';
import type { ProviderLoginButtonProps } from './button.js';
import { OpenAICodexLoginButton } from './openai-codex.js';

export const LOGIN_BUTTONS: Record<
	string,
	ComponentType<ProviderLoginButtonProps>
> = {
	anthropic: AnthropicLoginButton,
	'openai-codex': OpenAICodexLoginButton,
};
