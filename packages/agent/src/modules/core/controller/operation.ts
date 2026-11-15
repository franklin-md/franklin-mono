export function createControllerOperation() {
	let active: AbortController | undefined;
	return {
		begin() {
			if (active) throw new Error('Session operation already in progress');
			active = new AbortController();
			return active;
		},
		end(run: AbortController) {
			// An observer may start another prompt before the previous generator exits.
			if (active === run) active = undefined;
		},
		cancel() {
			active?.abort();
		},
	};
}
