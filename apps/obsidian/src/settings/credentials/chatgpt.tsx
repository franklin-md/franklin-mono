import { useAuthEntries, useOAuthLogin } from '@franklin/react';
import { Button, OpenAICodexLoginButton, ProviderIcon } from '@franklin/ui';

import { SettingControl } from '../../components/obsidian-native/setting/control.js';
import { SettingDescription } from '../../components/obsidian-native/setting/description.js';
import { SettingInfo } from '../../components/obsidian-native/setting/info.js';
import { SettingItem } from '../../components/obsidian-native/setting/item.js';
import { SettingName } from '../../components/obsidian-native/setting/name.js';

const OPENAI_CODEX_PROVIDER = 'openai-codex';

export function ChatGPTLoginField() {
	const { isOAuthSignedIn } = useAuthEntries();
	const { state, pending, handleLogin, remove } = useOAuthLogin(
		OPENAI_CODEX_PROVIDER,
	);
	const signedIn = isOAuthSignedIn(OPENAI_CODEX_PROVIDER);

	return (
		<SettingItem>
			<SettingInfo>
				<SettingName>
					<span className="inline-flex items-center gap-2">
						<ProviderIcon
							aria-hidden="true"
							className="shrink-0"
							focusable="false"
							provider={OPENAI_CODEX_PROVIDER}
							size={16}
						/>
						ChatGPT
					</span>
				</SettingName>
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
