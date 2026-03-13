import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiAgentDemo } from '@/components/demos/multi-agent-demo';
import { SpawnDemo } from '@/components/demos/spawn-demo';
import { TransportDemo } from '@/components/demos/transport-demo';

export function App() {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b px-6 py-4">
				<h1 className="text-xl font-semibold tracking-tight">Franklin Demo</h1>
				<p className="text-sm text-muted-foreground">
					ACP orchestration patterns with middleware composition
				</p>
			</header>

			<main className="mx-auto max-w-4xl p-6">
				<Tabs defaultValue="spawn">
					<TabsList>
						<TabsTrigger value="spawn">Spawn</TabsTrigger>
						<TabsTrigger value="multi-agent">Multi-Agent</TabsTrigger>
						<TabsTrigger value="transport">Transport</TabsTrigger>
					</TabsList>

					<TabsContent value="spawn">
						<SpawnDemo />
					</TabsContent>

					<TabsContent value="multi-agent">
						<MultiAgentDemo />
					</TabsContent>

					<TabsContent value="transport">
						<TransportDemo />
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}
