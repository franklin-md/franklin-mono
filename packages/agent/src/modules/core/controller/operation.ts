export function createSessionOperation() {
	let active: AbortController | undefined;
	return {
		begin() {
			if (active) throw new Error('Session operation already in progress');
			active = new AbortController();
		},
		end() {
			active?.abort();
			active = undefined;
		},
		cancel() {
			active?.abort();
		},
		signal() {
			if (!active) throw new Error('No active session operation');
			return active.signal;
		},
	};
}
