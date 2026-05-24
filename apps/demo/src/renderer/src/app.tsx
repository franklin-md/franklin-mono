import { ApplicationProvider, DefaultAuthActionProvider } from '@franklin/ui';
import { AgentChatPage } from '@/pages/agent-chat/agent-chat-page.js';
import { bindHostAction, openExternalAction } from '@franklin/react';
import { createElectronPlatform } from '@franklin/electron/renderer';
import {
	conversationExtension,
	conversationTitleExtension,
	todoExtension,
	statusExtension,
	filesystemBundle,
	bashExtension,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createWebExtension,
	spawnExtension,
	environmentInfoExtension,
	webSearchProviders,
} from '@franklin/agent';

import { useHarnessStartup } from './use-harness-startup.js';

const webExtension = createWebExtension({});
const webSearchProviderExtensions = [
	webSearchProviders.of(createExaWebSearchProvider()),
	webSearchProviders.of(createDuckDuckGoWebSearchProvider()),
];
const platform = createElectronPlatform();
const hostActionBindings = [
	bindHostAction(openExternalAction, (url) => platform.os.openExternal(url)),
];
const extensionBundles = [
	conversationExtension,
	conversationTitleExtension,
	todoExtension,
	statusExtension,
	filesystemBundle,
	bashExtension,
	webExtension,
	spawnExtension,
	environmentInfoExtension,
];
const extensions = [
	...webSearchProviderExtensions,
	...extensionBundles.map((bundle) => bundle.extension),
];

export function App() {
	const startup = useHarnessStartup({ extensions, platform });

	if (startup.status === 'error') {
		throw startup.error;
	}

	if (startup.status === 'loading') {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Loading…
			</div>
		);
	}

	return (
		<ApplicationProvider
			harness={startup.harness}
			hostActionBindings={hostActionBindings}
		>
			<DefaultAuthActionProvider>
				<div className="flex h-screen bg-background">
					<AgentChatPage />
				</div>
			</DefaultAuthActionProvider>
		</ApplicationProvider>
	);
}
