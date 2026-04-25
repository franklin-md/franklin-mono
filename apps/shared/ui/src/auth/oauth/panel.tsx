import { useAsync } from '@franklin/react';

import { useAuthManager } from '../context.js';

import type { OAuthProviderMeta } from './types.js';
import { ProviderRow } from './provider-row.js';

// Only surface these providers in the OAuth UI.
const ALLOWED_PROVIDERS = new Set(['anthropic', 'openai-codex']);

export function OAuthPanel() {
	const auth = useAuthManager();

	const providers = useAsync(
		() => {
			const all = auth.getOAuthProviders();
			return Promise.resolve(
				all.filter((p: OAuthProviderMeta) => ALLOWED_PROVIDERS.has(p.id)),
			);
		},
		[],
		[auth],
	);

	return (
		<div className="flex flex-col gap-3">
			{providers.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No OAuth providers registered.
				</p>
			)}
			{providers.map((provider) => (
				<ProviderRow key={provider.id} provider={provider} />
			))}
		</div>
	);
}
