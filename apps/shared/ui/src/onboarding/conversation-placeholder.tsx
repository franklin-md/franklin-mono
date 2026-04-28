import { useAuthEntries, useOAuthLogin } from '@franklin/react';

import { OpenAICodexLoginButton } from '../auth/login-button/openai-codex.js';
import { isOAuthFlowRunning } from '../auth/login-button/flow.js';
import { DefaultEmptyConversationPlaceholder } from '../conversation/default-empty-placeholder.js';

const CODEX_PROVIDER_ID = 'openai-codex';

export function ConversationOnboardingPlaceholder() {
	const { providerCount } = useAuthEntries();
	const { state, handleLogin } = useOAuthLogin(CODEX_PROVIDER_ID);

	if (providerCount > 0) {
		return <DefaultEmptyConversationPlaceholder />;
	}

	return (
		<div className="flex min-h-[320px] flex-col items-center justify-center gap-4 py-16 text-center">
			<p className="text-lg font-semibold tracking-tight text-foreground">
				Welcome to Franklin!
			</p>
			<OpenAICodexLoginButton
				isLoading={isOAuthFlowRunning(state)}
				providerName="Login with ChatGPT"
				onClick={() => {
					void handleLogin();
				}}
			/>
		</div>
	);
}
