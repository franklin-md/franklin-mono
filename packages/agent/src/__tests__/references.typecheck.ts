import { referenceHandlerExtension } from '../extensions/index.js';
import type { FranklinAPI, FranklinRuntime } from '../types.js';

const _referenceOnlyExtension = referenceHandlerExtension({
	test(reference) {
		return reference.locator === 'text';
	},
	toContext() {
		return { content: { type: 'text', text: 'context' } };
	},
});
void _referenceOnlyExtension;

const _api = null as unknown as FranklinAPI;
_api.registerReferenceHandler({
	test(reference) {
		return reference.locator === 'text';
	},
	toContext(_reference, delegate) {
		void delegate({ locator: 'nested' });
		return { content: { type: 'text', text: 'context' } };
	},
});

const _runtime = null as unknown as FranklinRuntime;
void _runtime.references.toContext({ locator: 'hello' });
