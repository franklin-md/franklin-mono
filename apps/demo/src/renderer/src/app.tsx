import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentChatPage } from '@/pages/agent-chat/agent-chat-page.js';
import { DemoAuthControls } from '@/components/demo-auth-controls.js';

export function App() {
	return (
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
	);
}
