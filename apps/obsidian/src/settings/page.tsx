import {
	useApp,
	useAuthEntries,
	useAuthManager,
	useOAuthLogin,
} from '@franklin/react';
import { Button, Input, OpenAICodexLoginButton } from '@franklin/ui';

import { SettingControl } from '../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../components/obsidian-native/setting/info.js';
import { SettingItem } from '../components/obsidian-native/setting/item.js';
import { SettingName } from '../components/obsidian-native/setting/name.js';

const OPENROUTER_PROVIDER = 'openrouter';
const OPENROUTER_API_KEYS_URL = 'https://openrouter.ai/settings/keys';
const OPENAI_CODEX_PROVIDER = 'openai-codex';

export function SettingsPage() {
	return (
		<>
			<OpenRouterApiKeyField />
			<ChatGPTLoginField />
		</>
	);
}

function OpenRouterApiKeyField() {
	const app = useApp();
	const auth = useAuthManager();
	const { entries } = useAuthEntries();

	const value = entries[OPENROUTER_PROVIDER]?.apiKey?.key ?? '';

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>OpenRouter API key</SettingName>
				<SettingDescription>
					Used for LLM access via OpenRouter.{' '}
					<a
						href={OPENROUTER_API_KEYS_URL}
						target="_blank"
						rel="noreferrer"
						onClick={(event) => {
							event.preventDefault();
							void app.platform.os.openExternal(OPENROUTER_API_KEYS_URL);
						}}
					>
						OpenRouter API keys
					</a>
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
	const { state, pending, handleLogin, remove } = useOAuthLogin(
		OPENAI_CODEX_PROVIDER,
	);
	const signedIn = isOAuthSignedIn(OPENAI_CODEX_PROVIDER);

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>ChatGPT</SettingName>
				<SettingDescription>
					{signedIn
						? 'Signed in to ChatGPT.'
						: 'Sign in to use OpenAI Codex models.'}
					{state.phase === 'error' && ` ${state.message}`}
				</SettingDescription>
			</SettingInfo>
			<SettingControl>
				{signedIn ? (
					<Button
						disabled={pending}
						size="sm"
						variant="outline"
						onClick={remove}
					>
						Sign out
					</Button>
				) : (
					<OpenAICodexLoginButton
						providerName="Sign in with ChatGPT"
						isLoading={pending}
						onClick={() => {
							void handleLogin();
						}}
					/>
				)}
			</SettingControl>
		</SettingItem>
	);
}
