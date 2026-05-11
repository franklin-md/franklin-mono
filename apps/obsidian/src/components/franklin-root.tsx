import type { FranklinApp } from '@franklin/agent/browser';
import type { AuthActionHandler } from '@franklin/react';
import { AppContext, AuthActionProvider } from '@franklin/react';
import type { App as ObsidianApp } from 'obsidian';
import type { ReactNode } from 'react';

import { ObsidianAppContext } from './obsidian-app-context.js';

type Props = {
	app: FranklinApp;
	children: ReactNode;
	obsidianApp: ObsidianApp;
	requestApiKey: AuthActionHandler;
};

export function FranklinRoot({
	app,
	children,
	obsidianApp,
	requestApiKey,
}: Props) {
	return (
		<ObsidianAppContext.Provider value={obsidianApp}>
			<AppContext.Provider value={app}>
				<AuthActionProvider handlers={{ requestApiKey }}>
					{children}
				</AuthActionProvider>
			</AppContext.Provider>
		</ObsidianAppContext.Provider>
	);
}
