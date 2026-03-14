import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThreadPage } from '@/pages/thread/thread-page';

export function App() {
	return (
		<div className="flex h-screen flex-col bg-background">
			<header className="border-b px-6 py-3">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-semibold tracking-tight">
						Franklin — Demo
					</h1>
				</div>
			</header>

			<Tabs
				defaultValue="thread"
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="border-b px-6">
					<TabsList>
						<TabsTrigger value="thread">Thread</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="thread" className="flex flex-1 overflow-hidden m-0">
					<ThreadPage />
				</TabsContent>
			</Tabs>
		</div>
	);
}
