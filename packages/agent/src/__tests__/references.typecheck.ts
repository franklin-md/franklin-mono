import { referenceHandlerExtension } from '../extensions/index.js';
import type { FranklinAPI, FranklinRuntime } from '../types.js';

const _referenceOnlyExtension = referenceHandlerExtension({
	test(reference) {
		return reference.type === 'text.document';
	},
	toContext() {
		return { content: [] };
	},
});
void _referenceOnlyExtension;

const _api = null as unknown as FranklinAPI;
_api.registerReferenceHandler({
	test(reference) {
		return reference.type === 'text.document';
	},
	toContext(_reference, delegate) {
		void delegate({ type: 'text.document', locator: 'nested' });
		return { content: [] };
	},
});

const _runtime = null as unknown as FranklinRuntime;
void _runtime.references.toContext({ type: 'text.document', locator: 'hello' });
