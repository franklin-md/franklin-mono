import type { FranklinApp } from '@franklin/agent';
import type {
	AgentCreateInput,
	AuthActionHandler,
	HostActionBinding,
} from '@franklin/react';
import type { App as ObsidianApp } from 'obsidian';
import type { ReactNode } from 'react';

import { ConversationWindow } from './window.js';
import { FranklinRoot } from './root.js';

type Args = {
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
	hostActionBindings: readonly HostActionBinding[];
	obsidianApp: ObsidianApp;
	requestApiKey: AuthActionHandler;
};

export function createFranklinViewContent({
	app,
	getCreateInput,
	hostActionBindings,
	obsidianApp,
	requestApiKey,
}: Args): ReactNode {
	return (
		<FranklinRoot
			app={app}
			hostActionBindings={hostActionBindings}
			obsidianApp={obsidianApp}
			requestApiKey={requestApiKey}
		>
			<ConversationWindow getCreateInput={getCreateInput} />
		</FranklinRoot>
	);
}
