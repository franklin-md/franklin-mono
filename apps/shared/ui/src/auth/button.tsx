import { useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';

import { Button } from '../primitives/button.js';
import { Dialog, DialogTrigger } from '../primitives/dialog.js';

import { useAuthManager } from './context.js';
import { AuthModalContent } from './modal.js';
import { apiKeyPanel, oauthPanel } from './panels.js';

function PersonIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
		</svg>
	);
}

export function AuthButton() {
	const auth = useAuthManager();
	const [providerCount, setProviderCount] = useState(
		() => Object.keys(auth.entries()).length,
	);

	useEffect(() => {
		setProviderCount(Object.keys(auth.entries()).length);
	}, [auth]);

	function handleEntriesChange(entries: AuthEntries) {
		setProviderCount(Object.keys(entries).length);
	}

	const isSignedIn = providerCount > 0;

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5 rounded-full">
					<PersonIcon />
					{isSignedIn
						? `${providerCount} provider${providerCount > 1 ? 's' : ''}`
						: 'Sign in'}
				</Button>
			</DialogTrigger>

			<AuthModalContent
				panels={[oauthPanel, apiKeyPanel]}
				onEntriesChange={handleEntriesChange}
			/>
		</Dialog>
	);
}
