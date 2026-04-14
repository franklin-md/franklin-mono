import { createObserver } from '@franklin/lib';
import type { RuntimeBase } from '../types.js';
import type { Session, SessionEvent } from './types.js';

export class SessionCollection<RT extends RuntimeBase<any>> {
	private readonly sessions = new Map<string, Session<RT>>();
	private readonly observer = createObserver<[SessionEvent<RT>]>();

	get(id: string): Session<RT> | undefined {
		return this.sessions.get(id);
	}

	has(id: string): boolean {
		return this.sessions.has(id);
	}

	set(id: string, runtime: RT): void {
		this.sessions.set(id, { id, runtime });
		this.observer.notify({ action: 'add', id, runtime });
	}

	async remove(id: string): Promise<boolean> {
		const session = this.sessions.get(id);
		if (!session) return false;
		this.sessions.delete(id);
		this.observer.notify({ action: 'remove', id, runtime: session.runtime });
		await session.runtime.dispose();
		return true;
	}

	list(): Session<RT>[] {
		return Array.from(this.sessions.values());
	}

	subscribe(listener: (event: SessionEvent<RT>) => void): () => void {
		return this.observer.subscribe(listener);
	}
}
