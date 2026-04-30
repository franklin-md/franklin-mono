import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import type { AuthActionHandler } from '@franklin/react';
import type { ReactNode } from 'react';

import { ConversationWindow } from './conversation-window/window.js';
import { FranklinRoot } from './franklin-root.js';

type Args = {
	app: FranklinApp;
	getCreateInput: () => AgentCreateInput;
	requestApiKey: AuthActionHandler;
};

export function createFranklinViewContent({
	app,
	getCreateInput,
	requestApiKey,
}: Args): ReactNode {
	return (
		<FranklinRoot app={app} requestApiKey={requestApiKey}>
			<ConversationWindow getCreateInput={getCreateInput} />
		</FranklinRoot>
	);
}
