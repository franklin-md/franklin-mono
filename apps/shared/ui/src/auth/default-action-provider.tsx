import { useCallback, useState, type ReactNode } from 'react';

import { AuthActionProvider } from '@franklin/react';

import { Dialog } from '../primitives/dialog.js';

import { AuthModalContent } from './settings-page/modal.js';
import { apiKeyPanel } from './settings-page/panels.js';

/**
 * Standalone web/Electron default: owns a single shared API-key Dialog and
 * supplies `requestApiKey` that opens it. Apps with a different surface for
 * key entry (e.g. Obsidian's settings tab) should bypass this and use
 * `<AuthActionProvider handlers={...}>` directly.
 */
export function DefaultAuthActionProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);

	const requestApiKey = useCallback(() => {
		setOpen(true);
	}, []);

	return (
		<AuthActionProvider handlers={{ requestApiKey }}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				<AuthModalContent panels={[apiKeyPanel]} />
			</Dialog>
		</AuthActionProvider>
	);
}
