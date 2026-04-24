import { useAsync } from '@franklin/react';

import { useAuthManager } from '../context.js';

import { LOGIN_BUTTONS } from '../login-button/registry.js';

import { ProviderRow } from './provider-row.js';

export function OAuthPanel() {
	const auth = useAuthManager();

	const providers = useAsync(
		() => {
			const all = auth.getOAuthProviders();
			return Promise.resolve(all.filter((p) => p.id in LOGIN_BUTTONS));
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
