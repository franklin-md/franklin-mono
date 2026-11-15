import { directiveState } from './codec.js';

export function parseDirectiveState(value: unknown) {
	try {
		// Reject cycles before Zod walks the object. Its parsed value is a detached
		// snapshot, so the caller can keep editing the original during the save.
		JSON.stringify(value);
		return directiveState.parse(value);
	} catch {
		throw new Error('Directive state must be JSON-serializable');
	}
}
