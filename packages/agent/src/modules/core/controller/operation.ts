export function createSessionOperation() {
	let active: AbortController | undefined;
	const updates = new Set<string>();
	const pending = new Map<string, Set<() => void>>();
	return {
		begin() {
			if (active) throw new Error('Session operation already in progress');
			active = new AbortController();
			updates.clear();
		},
		end() {
			active?.abort();
			active = undefined;
			pending.clear();
		},
		cancel() {
			active?.abort();
		},
		signal() {
			if (!active) throw new Error('No active session operation');
			return active.signal;
		},
		recordUpdate(id: string) {
			updates.add(id);
			for (const resolve of pending.get(id) ?? []) resolve();
			pending.delete(id);
		},
		async waitForUpdate(id?: string) {
			if (!id || updates.has(id)) return;
			const signal = this.signal();
			signal.throwIfAborted();
			await new Promise<void>((resolve, reject) => {
				const abort = () => {
					pending.delete(id);
					reject(new Error('Session operation cancelled'));
				};
				const complete = () => {
					signal.removeEventListener('abort', abort);
					resolve();
				};
				const waiters = pending.get(id) ?? new Set<() => void>();
				waiters.add(complete);
				pending.set(id, waiters);
				signal.addEventListener('abort', abort, { once: true });
			});
		},
	};
}
