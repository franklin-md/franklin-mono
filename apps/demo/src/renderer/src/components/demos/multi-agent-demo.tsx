import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { DemoAgentSession } from '@/lib/agent-session';
import { createAgentSession } from '@/lib/agent-session';

// Individual agent card that subscribes to its own session store
function AgentCard({
	session,
	onDispose,
}: {
	session: DemoAgentSession;
	onDispose: () => void;
}) {
	const snapshot = useSyncExternalStore(
		(cb: () => void) => session.store.subscribe(cb),
		() => session.store.getSnapshot(),
	);

	return (
		<div className="flex items-center justify-between rounded-lg border p-4">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{session.agentName}</span>
					<Badge variant="outline">{session.agentId}</Badge>
				</div>
				<p className="text-xs text-muted-foreground">
					Session: {session.sessionId}
					{snapshot.transcript.length > 0 &&
						` | ${snapshot.transcript.length} events`}
				</p>
			</div>
			<Button variant="destructive" size="sm" onClick={onDispose}>
				Dispose
			</Button>
		</div>
	);
}

export function MultiAgentDemo() {
	const [sessions, setSessions] = useState<DemoAgentSession[]>([]);
	const [isSpawning, setIsSpawning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Force re-render when sessions list changes (since sessions are mutable objects)
	const sessionsRef = useRef(sessions);
	sessionsRef.current = sessions;

	const spawnAgent = useCallback(async (name: string) => {
		setIsSpawning(true);
		setError(null);
		try {
			const session = await createAgentSession(name, '/tmp');
			setSessions((prev) => [...prev, session]);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsSpawning(false);
		}
	}, []);

	const disposeAgent = useCallback(async (agentId: string) => {
		const session = sessionsRef.current.find((s) => s.agentId === agentId);
		if (!session) return;
		try {
			await session.dispose();
		} catch {
			// Ignore dispose errors
		}
		setSessions((prev) => prev.filter((s) => s.agentId !== agentId));
	}, []);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Multi-Agent Orchestration</CardTitle>
					<CardDescription>
						Spawn multiple agents and observe them running in parallel.
						Demonstrates Franklin's agent lifecycle management across concurrent
						sessions.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Button
							onClick={() => void spawnAgent('codex')}
							disabled={isSpawning}
						>
							{isSpawning ? 'Spawning...' : '+ Codex Agent'}
						</Button>
						<Button
							variant="outline"
							onClick={() => void spawnAgent('claude-acp')}
							disabled={isSpawning}
						>
							{isSpawning ? 'Spawning...' : '+ Claude Agent'}
						</Button>
					</div>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{sessions.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No agents spawned yet. Click a button above to get started.
						</p>
					) : (
						<div className="grid gap-3">
							{sessions.map((s) => (
								<AgentCard
									key={s.agentId}
									session={s}
									onDispose={() => void disposeAgent(s.agentId)}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
