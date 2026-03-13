import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgent } from '@/hooks/use-agent';

export function SpawnDemo() {
	const {
		session,
		snapshot,
		isSpawning,
		isPrompting,
		error,
		spawn,
		prompt,
		dispose,
	} = useAgent();
	const [input, setInput] = useState('');

	const handleSpawn = () => {
		void spawn('codex', '/tmp');
	};

	const handlePrompt = () => {
		if (!input.trim()) return;
		void prompt(input.trim());
		setInput('');
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Spawn Agent</CardTitle>
					<CardDescription>
						Spawn a single ACP agent and send prompts to it. This demonstrates
						the basic Franklin spawn + prompt lifecycle.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						{!session ? (
							<Button onClick={handleSpawn} disabled={isSpawning}>
								{isSpawning ? 'Spawning...' : 'Spawn Codex Agent'}
							</Button>
						) : (
							<>
								<Badge variant="secondary">
									{session.agentName} ({session.agentId})
								</Badge>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => void dispose()}
								>
									Dispose
								</Button>
							</>
						)}
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{session && (
						<div className="flex gap-2">
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handlePrompt();
								}}
								placeholder="Send a message..."
								className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								disabled={isPrompting}
							/>
							<Button
								onClick={handlePrompt}
								disabled={isPrompting || !input.trim()}
							>
								{isPrompting ? 'Sending...' : 'Send'}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{snapshot.transcript.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Transcript</CardTitle>
						<CardDescription>
							{snapshot.transcript.length} event(s) received
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-[400px]">
							<div className="space-y-2">
								{snapshot.transcript.map((entry) => (
									<div
										key={entry.id}
										className="rounded-md border bg-muted/50 p-3"
									>
										<div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
											<span>{entry.id}</span>
											<span>
												{new Date(entry.receivedAt).toLocaleTimeString()}
											</span>
										</div>
										<pre className="overflow-x-auto text-xs">
											{JSON.stringify(entry.notification, null, 2)}
										</pre>
									</div>
								))}
							</div>
						</ScrollArea>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
