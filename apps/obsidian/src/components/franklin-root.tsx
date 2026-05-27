import type { FranklinApp } from '@franklin/agent';
import type { AuthActionHandler, HostActionBinding } from '@franklin/react';
import { AuthActionProvider, FileCollectionProvider } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { App as ObsidianApp } from 'obsidian';
import { useEffect, useMemo, type ReactNode } from 'react';

import { ObsidianFileCollection } from '../file-search/collection.js';
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
	const fileCollection = useMemo(
		() => new ObsidianFileCollection(obsidianApp),
		[obsidianApp],
	);

	useEffect(() => {
		return () => {
			fileCollection.dispose();
		};
	}, [fileCollection]);

	return (
		<ObsidianAppProvider value={obsidianApp}>
			<FileCollectionProvider collection={fileCollection}>
				<ApplicationProvider
					harness={app}
					hostActionBindings={hostActionBindings}
				>
					<AuthActionProvider handlers={{ requestApiKey }}>
						{children}
					</AuthActionProvider>
				</ApplicationProvider>
			</FileCollectionProvider>
		</ObsidianAppProvider>
	);
}
