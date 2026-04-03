import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
	SessionRuntime,
	FranklinApp,
	Session,
	SessionManager,
} from '@franklin/agent/browser';
import { AppContext } from '../franklin-context.js';
import { useSessions } from '../use-sessions.js';

function makeSession(sessionId: string): Session {
	return {
		sessionId,
		runtime: {} as SessionRuntime,
	};
}

class FakeSessionManager {
	private sessions: Session[];
	private listeners = new Set<() => void>();

	constructor(initialSessions: Session[] = []) {
		this.sessions = initialSessions;
	}

	list(): Session[] {
		return [...this.sessions];
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	push(session: Session): void {
		this.sessions = [...this.sessions, session];
		this.emit();
	}

	emit(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

function makeWrapper(manager: FakeSessionManager) {
	const app = {
		agents: manager as unknown as SessionManager,
	} as FranklinApp;
	return function Wrapper({ children }: { children: ReactNode }) {
		return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
	};
}

describe('useSessions', () => {
	it('reuses the previous snapshot when the ordered session list is unchanged', () => {
		const manager = new FakeSessionManager([makeSession('a')]);
		const renderCount = { value: 0 };
		const wrapper = makeWrapper(manager);

		const { result } = renderHook(
			() => {
				renderCount.value++;
				return useSessions();
			},
			{ wrapper },
		);

		const firstSnapshot = result.current;
		const before = renderCount.value;

		act(() => {
			manager.emit();
		});

		expect(renderCount.value).toBe(before);
		expect(result.current).toBe(firstSnapshot);
	});

	it('publishes a new snapshot when the ordered session list changes', () => {
		const manager = new FakeSessionManager([makeSession('a')]);
		const wrapper = makeWrapper(manager);
		const { result } = renderHook(() => useSessions(), { wrapper });

		const firstSnapshot = result.current;

		act(() => {
			manager.push(makeSession('b'));
		});

		expect(result.current).not.toBe(firstSnapshot);
		expect(result.current.map((session) => session.sessionId)).toEqual([
			'a',
			'b',
		]);
	});
});
