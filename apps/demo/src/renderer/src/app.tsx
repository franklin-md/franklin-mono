import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentChatPage } from '@/pages/agent-chat/agent-chat-page.js';
import { DemoAuthControls } from '@/components/demo-auth-controls.js';
import { FranklinProvider } from '@franklin/react';
import {
	createElectronPlatform,
	ElectronAuthManager,
} from '@franklin/electron/renderer';
import {
	conversationExtension,
	todoExtension,
	statusExtension,
	readExtension,
	writeExtension,
	editExtension,
	globExtension,
	bashExtension,
	createWebFetchExtension,
} from '@franklin/extensions';

const webFetchExtension = createWebFetchExtension({});
const platform = createElectronPlatform();
const extensionBundles = [
	conversationExtension,
	todoExtension,
	statusExtension,
	readExtension,
	writeExtension,
	editExtension,
	globExtension,
	bashExtension,
	webFetchExtension,
];
const extensions = extensionBundles.map((bundle) => bundle.extension);

const auth = new ElectronAuthManager(window.__franklinAuth);

export function App() {
	return (
		<FranklinProvider
			auth={auth}
			extensions={extensions}
			platform={platform}
			fallback={
				<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					Loading…
				</div>
			}
		>
			<div className="flex h-screen flex-col bg-background">
				<header className="border-b px-6 py-3">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold tracking-tight">
							Franklin — Demo
						</h1>
						<DemoAuthControls />
					</div>
				</header>

				<Tabs
					defaultValue="agent-chat"
					className="flex flex-1 flex-col overflow-hidden"
				>
					<div className="border-b px-6">
						<TabsList>
							<TabsTrigger value="agent-chat">Agent Chat</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent
						value="agent-chat"
						className="flex flex-1 overflow-hidden m-0"
					>
						<AgentChatPage />
					</TabsContent>
				</Tabs>
			</div>
		</FranklinProvider>
	);
}
