import { DefaultAuthActionProvider } from '@franklin/ui';
import { AgentChatPage } from '@/pages/agent-chat/agent-chat-page.js';
import { FranklinProvider } from '@franklin/react';
import { createElectronPlatform } from '@franklin/electron/renderer';
import {
	conversationExtension,
	todoExtension,
	statusExtension,
	filesystemExtension,
	bashExtension,
	createWebExtension,
	spawnExtension,
	environmentInfoExtension,
} from '@franklin/extensions';

const webExtension = createWebExtension({});
const platform = createElectronPlatform();
const extensionBundles = [
	conversationExtension,
	todoExtension,
	statusExtension,
	filesystemExtension,
	bashExtension,
	webExtension,
	spawnExtension,
	environmentInfoExtension,
];
const extensions = extensionBundles.map((bundle) => bundle.extension);

export function App() {
	return (
		<FranklinProvider
			extensions={extensions}
			platform={platform}
			fallback={
				<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					Loading…
				</div>
			}
		>
			<DefaultAuthActionProvider>
				<div className="flex h-screen bg-background">
					<AgentChatPage />
				</div>
			</DefaultAuthActionProvider>
		</FranklinProvider>
	);
}
