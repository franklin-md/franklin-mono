import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import type {
	DemoAgentSession,
	SessionSnapshot,
} from '../lib/agent-session.js';
import { createAgentSession } from '../lib/agent-session.js';

const EMPTY_SNAPSHOT: SessionSnapshot = { transcript: [] };
const NOOP_SUBSCRIBE = (): (() => void) => () => {};

/**
 * React hook for single-agent lifecycle management.
 *
 * Spawns an agent subprocess via IPC, creates the full ACP stack in the
 * renderer, and provides a reactive session snapshot via useSyncExternalStore.
 */
export function useAgent() {
	const [session, setSession] = useState<DemoAgentSession | null>(null);
	const [isSpawning, setIsSpawning] = useState(false);
	const [isPrompting, setIsPrompting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const sessionRef = useRef<DemoAgentSession | null>(null);

	const subscribe = session
		? (cb: () => void) => session.store.subscribe(cb)
		: NOOP_SUBSCRIBE;
	const getSnapshot = session
		? () => session.store.getSnapshot()
		: () => EMPTY_SNAPSHOT;
	const snapshot = useSyncExternalStore(subscribe, getSnapshot);

	const spawn = useCallback(async (agentName: string, cwd: string) => {
		setIsSpawning(true);
		setError(null);
		try {
			const s = await createAgentSession(agentName, cwd);
			sessionRef.current = s;
			setSession(s);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsSpawning(false);
		}
	}, []);

	const prompt = useCallback(async (message: string) => {
		const s = sessionRef.current;
		if (!s) return;
		setIsPrompting(true);
		setError(null);
		try {
			await s.stack.prompt({
				sessionId: s.sessionId,
				prompt: [{ type: 'text', text: message }],
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsPrompting(false);
		}
	}, []);

	const dispose = useCallback(async () => {
		const s = sessionRef.current;
		if (!s) return;
		try {
			await s.dispose();
		} catch {
			// Ignore dispose errors
		} finally {
			sessionRef.current = null;
			setSession(null);
		}
	}, []);

	return {
		session,
		snapshot,
		isSpawning,
		isPrompting,
		error,
		spawn,
		prompt,
		dispose,
	};
}
