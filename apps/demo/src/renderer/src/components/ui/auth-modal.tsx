import { useCallback, useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@franklin/ui';

import { ApiKeyPanel } from './api-key-panel.js';
import { useAuthManager } from './auth-context.js';
import { OAuthPanel } from './oauth-panel.js';

/**
 * Full-screen overlay modal for authentication.
 *
 * Shows two tabs:
 * - **OAuth Providers**: list of OAuth providers with sign-in buttons and inline flow
 * - **API Keys**: manage stored API keys for any provider
 *
 * `onClose` is called when the user dismisses the modal (backdrop click or × button).
 * `onEntriesChange` is called with the latest entries after any mutation so the
 * caller (e.g. `AuthButton`) can update its own derived state without re-reading disk.
 */
export function AuthModal({
	onClose,
	onEntriesChange,
}: {
	onClose: () => void;
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
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
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
		</Dialog>
	);
}
