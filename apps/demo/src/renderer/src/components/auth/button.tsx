import { useEffect, useState } from 'react';

import type { AuthEntries } from '@franklin/agent/browser';
import { Button } from '@franklin/ui';

import { useAuthManager } from './context.js';
import { AuthModal } from './modal.js';

// ---------------------------------------------------------------------------
// PersonIcon — minimal inline SVG, no external dependencies
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AuthButton
// ---------------------------------------------------------------------------

/**
 * A sign-in button for the top-right corner of an application.
 *
 * - Shows "Sign in" when no credentials are saved.
 * - Shows the number of configured providers when credentials exist.
 * - Opens `<AuthModal>` on click.
 *
 * Must be rendered inside an `<AuthProvider>`.
 */
export function AuthButton() {
	const auth = useAuthManager();
	const [open, setOpen] = useState(false);
	const [providerCount, setProviderCount] = useState(0);
	const isSignedIn = providerCount > 0;

	useEffect(() => {
		setProviderCount(Object.keys(auth.entries()).length);
	}, [auth]);

	function handleEntriesChange(entries: AuthEntries) {
		setProviderCount(Object.keys(entries).length);
	}

	function handleClose() {
		setOpen(false);
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="gap-1.5 rounded-full"
				onClick={() => {
					setOpen(true);
				}}
			>
				<PersonIcon />
				{isSignedIn
					? `${providerCount} provider${providerCount > 1 ? 's' : ''}`
					: 'Sign in'}
			</Button>

			{open && (
				<AuthModal
					onClose={handleClose}
					onEntriesChange={handleEntriesChange}
				/>
			)}
		</>
	);
}
