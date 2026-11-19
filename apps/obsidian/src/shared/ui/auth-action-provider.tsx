import type { ReactNode } from 'react';
import type { App } from 'obsidian';
import { AuthActionProvider } from '@franklin/react';
import { openPluginSettings } from '../obsidian/settings/open.js';

type Props = {
	app: App;
	pluginId: string;
	children: ReactNode;
};

// Credential requests from any Franklin surface open Settings → Connections.
export function ObsidianAuthActionProvider({ app, pluginId, children }: Props) {
	return (
		<AuthActionProvider
			handlers={{
				requestApiKey: () => openPluginSettings(app, pluginId, 'connections'),
			}}
		>
			{children}
		</AuthActionProvider>
	);
}
