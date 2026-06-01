import type { FranklinApp } from '@franklin/agent';
import type { AuthActionHandler, HostActionBinding } from '@franklin/react';
import { AuthActionProvider, FileIndexProvider } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { App as ObsidianApp } from 'obsidian';
import { useEffect, useMemo, type ReactNode } from 'react';

import { ObsidianFileIndex } from '../file-search/obsidian-file-index.js';
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
	const fileIndex = useMemo(
		() => new ObsidianFileIndex(obsidianApp),
		[obsidianApp],
	);

	useEffect(() => {
		return () => {
			fileIndex.dispose();
		};
	}, [fileIndex]);

	return (
		<ObsidianAppProvider value={obsidianApp}>
			<FileIndexProvider fileIndex={fileIndex}>
				<ApplicationProvider
					harness={app}
					hostActionBindings={hostActionBindings}
				>
					<AuthActionProvider handlers={{ requestApiKey }}>
						{children}
					</AuthActionProvider>
				</ApplicationProvider>
			</FileIndexProvider>
		</ObsidianAppProvider>
	);
}
