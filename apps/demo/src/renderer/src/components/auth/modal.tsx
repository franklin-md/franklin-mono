import { useCallback, useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@franklin/ui';

import { ApiKeyPanel } from './api-key/panel.js';
import { useAuthManager } from './context.js';
import { OAuthPanel } from './oauth/panel.js';

/**
 * The content portion of the auth dialog (rendered inside a `<Dialog>` root
 * owned by `AuthButton`).
 *
 * Shows two tabs:
 * - **OAuth Providers**: list of OAuth providers with sign-in buttons
 * - **API Keys**: manage stored API keys
 *
 * `onEntriesChange` is called with the latest entries after any mutation so
 * the caller (e.g. `AuthButton`) can update its own derived state.
 */
export function AuthModalContent({
	onEntriesChange,
}: {
	onEntriesChange?: (entries: AuthEntries) => void;
}) {
	const auth = useAuthManager();
	const [savedEntries, setSavedEntries] = useState<AuthEntries>({});

	useEffect(() => {
		const entries = auth.entries();
		setSavedEntries(entries);
		onEntriesChange?.(entries);
	}, [auth, onEntriesChange]);

	const handleUpdate = useCallback(async () => {
		const entries = auth.entries();
		setSavedEntries(entries);
		onEntriesChange?.(entries);
	}, [auth, onEntriesChange]);

	return (
		<DialogContent className="w-[500px]">
			<DialogHeader>
				<DialogTitle>Authentication</DialogTitle>
			</DialogHeader>

			<Tabs defaultValue="oauth">
				<TabsList className="w-full">
					<TabsTrigger value="oauth" className="flex-1">
						OAuth Providers
					</TabsTrigger>
					<TabsTrigger value="apiKeys" className="flex-1">
						API Keys
					</TabsTrigger>
				</TabsList>

				{/* Both panels stay mounted so an in-progress OAuth flow is never lost */}
				<TabsContent
					value="oauth"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<OAuthPanel savedEntries={savedEntries} onUpdate={handleUpdate} />
				</TabsContent>
				<TabsContent
					value="apiKeys"
					forceMount
					className="data-[state=inactive]:hidden"
				>
					<ApiKeyPanel savedEntries={savedEntries} onUpdate={handleUpdate} />
				</TabsContent>
			</Tabs>
		</DialogContent>
	);
}
