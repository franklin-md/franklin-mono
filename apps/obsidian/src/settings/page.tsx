import { useAuthEntries, useAuthManager, useOAuthFlow } from '@franklin/react';
import {
	Button,
	Input,
	isOAuthFlowRunning,
	OpenAICodexLoginButton,
} from '@franklin/ui';

import { SettingControl } from '../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingHeading } from '../components/obsidian-native/setting/heading.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

const OPENROUTER_PROVIDER = 'openrouter';
const OPENAI_CODEX_PROVIDER = 'openai-codex';

export function SettingsPage() {
	return (
		<>
			<SettingHeading
				name="AI Credentials"
				description="Configure how Franklin reaches model providers."
			/>
			<OpenRouterApiKeyField />
			<ChatGPTLoginField />
		</>
	);
}

function OpenRouterApiKeyField() {
	const auth = useAuthManager();
	const { entries } = useAuthEntries();

	const value = entries[OPENROUTER_PROVIDER]?.apiKey?.key ?? '';

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>OpenRouter API key</SettingName>
				<SettingDescription>
					Used for LLM access via OpenRouter.
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				<Input
					aria-label="OpenRouter API key"
					type="password"
					autoComplete="off"
					placeholder="sk-or-..."
					value={value}
					onChange={(event) => {
						const trimmed = event.currentTarget.value.trim();
						if (trimmed) {
							auth.setApiKeyEntry(OPENROUTER_PROVIDER, {
								type: 'apiKey',
								key: trimmed,
							});
						} else {
							auth.removeApiKeyEntry(OPENROUTER_PROVIDER);
						}
					}}
				/>
			</SettingControl>
		</SettingItem>
	);
}

function ChatGPTLoginField() {
	const { isOAuthSignedIn } = useAuthEntries();
	const auth = useAuthManager();
	const { flowState, login } = useOAuthFlow(OPENAI_CODEX_PROVIDER);
	const signedIn = isOAuthSignedIn(OPENAI_CODEX_PROVIDER);

	const flowRunning = isOAuthFlowRunning(flowState);

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>ChatGPT</SettingName>
				<SettingDescription>
					{signedIn
						? 'Signed in to ChatGPT.'
						: 'Sign in to use OpenAI Codex models.'}
					{flowState.phase === 'error' && ` ${flowState.message}`}
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				{signedIn ? (
					<Button
						disabled={flowRunning}
						size="sm"
						variant="outline"
						onClick={() => {
							auth.removeOAuthEntry(OPENAI_CODEX_PROVIDER);
						}}
					>
						Sign out
					</Button>
				) : (
					<OpenAICodexLoginButton
						providerName="Sign in with ChatGPT"
						isLoading={flowRunning}
						onClick={() => {
							void login();
						}}
					/>
				)}
			</SettingControl>
		</SettingItem>
	);
}
