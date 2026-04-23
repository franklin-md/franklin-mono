import {
	AuthButton,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@franklin/ui';
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
			<div className="flex h-screen flex-col bg-background">
				<header className="border-b px-6 py-3">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold tracking-tight">
							Franklin — Demo
						</h1>
						<AuthButton />
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
