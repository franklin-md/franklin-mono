import React from 'react';

import { ProviderApiKeyField } from './apikey.js';
import { ChatGPTLoginField } from './chatgpt.js';

const OPENROUTER_PROVIDER = 'openrouter';
const OPENROUTER_API_KEYS_URL = 'https://openrouter.ai/settings/keys';
const OPENCODE_GO_PROVIDER = 'opencode-go';
const OPENCODE_GO_API_KEYS_URL = 'https://opencode.ai/auth';
const MISTRAL_PROVIDER = 'mistral';
const MISTRAL_API_KEYS_URL = 'https://console.mistral.ai/api-keys';

export function CredentialsSettings() {
	return (
		<>
			<ProviderApiKeyField
				provider={OPENROUTER_PROVIDER}
				name="OpenRouter"
				description="Used for LLM access via OpenRouter."
				linkUrl={OPENROUTER_API_KEYS_URL}
				linkLabel="OpenRouter API keys"
				placeholder="sk-or-..."
			/>
			<ProviderApiKeyField
				provider={OPENCODE_GO_PROVIDER}
				name="OpenCode Go"
				description="Used for OpenCode Go subscription models."
				linkUrl={OPENCODE_GO_API_KEYS_URL}
				linkLabel="OpenCode API keys"
				placeholder="OpenCode API key"
			/>
			<ProviderApiKeyField
				provider={MISTRAL_PROVIDER}
				name="Mistral"
				description="Used for premium PDF OCR."
				linkUrl={MISTRAL_API_KEYS_URL}
				linkLabel="Mistral API keys"
				placeholder="Mistral API key"
			/>
			<ChatGPTLoginField />
		</>
	);
}
