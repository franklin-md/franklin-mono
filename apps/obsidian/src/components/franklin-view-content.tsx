import type { FranklinApp } from '@franklin/agent/browser';
import type { AgentCreateInput, AuthActionHandler } from '@franklin/react';
import type { App as ObsidianApp } from 'obsidian';
import type { ReactNode } from 'react';

import { ConversationWindow } from './conversation-window/window.js';
import { FranklinRoot } from './franklin-root.js';

type Args = {
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
	obsidianApp: ObsidianApp;
	requestApiKey: AuthActionHandler;
};

export function createFranklinViewContent({
	app,
	getCreateInput,
	obsidianApp,
	requestApiKey,
}: Args): ReactNode {
	return (
		<FranklinRoot
			app={app}
			obsidianApp={obsidianApp}
			requestApiKey={requestApiKey}
		>
			<ConversationWindow getCreateInput={getCreateInput} />
		</FranklinRoot>
	);
}
