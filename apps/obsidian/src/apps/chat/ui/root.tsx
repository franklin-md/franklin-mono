import type { FranklinApp } from '@franklin/agent';
import type { HostActionBinding } from '@franklin/react';
import { FileIndexProvider } from '@franklin/react';
import { ApplicationProvider } from '@franklin/ui';
import type { App as ObsidianApp } from 'obsidian';
import { useEffect, useMemo, type ReactNode } from 'react';

import { ObsidianFileIndex } from '../../../shared/obsidian/filesystem/file-index.js';
import { ObsidianAppProvider } from '../../../shared/ui/obsidian-app-context.js';
import { ObsidianAuthActionProvider } from '../../../shared/ui/auth-action-provider.js';

type Props = {
	app: FranklinApp;
	children: ReactNode;
	hostActionBindings: readonly HostActionBinding[];
	obsidianApp: ObsidianApp;
	pluginId: string;
};

export function FranklinRoot({
	app,
	children,
	hostActionBindings,
	obsidianApp,
	pluginId,
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
					<ObsidianAuthActionProvider app={obsidianApp} pluginId={pluginId}>
						{children}
					</ObsidianAuthActionProvider>
				</ApplicationProvider>
			</FileIndexProvider>
		</ObsidianAppProvider>
	);
}
