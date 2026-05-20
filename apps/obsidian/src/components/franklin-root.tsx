import type { FranklinApp } from '@franklin/agent';
import type { AuthActionHandler, HostActionBinding } from '@franklin/react';
import { AuthActionProvider } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { App as ObsidianApp } from 'obsidian';
import type { ReactNode } from 'react';

import { ObsidianAppProvider } from './obsidian-app-context.js';

type Props = {
	app: FranklinApp;
	children: ReactNode;
	hostActionBindings: readonly HostActionBinding[];
	obsidianApp: ObsidianApp;
	requestApiKey: AuthActionHandler;
};

export function FranklinRoot({
	app,
	children,
	hostActionBindings,
	obsidianApp,
	requestApiKey,
}: Props) {
	return (
		<ObsidianAppProvider value={obsidianApp}>
			<ApplicationProvider
				harness={app}
				hostActionBindings={hostActionBindings}
			>
				<AuthActionProvider handlers={{ requestApiKey }}>
					{children}
				</AuthActionProvider>
			</ApplicationProvider>
		</ObsidianAppProvider>
	);
}
