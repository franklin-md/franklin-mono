import type { FranklinAPI, FranklinRuntime } from '../types.js';

const _api = null as unknown as FranklinAPI;
_api.registerReferenceHandler({
	type: 'text.document',
	toContext(_reference, ctx) {
		void ctx.references.toContext({ type: 'text.document', locator: 'nested' });
		return { content: [] };
	},
});

const _runtime = null as unknown as FranklinRuntime;
void _runtime.references.toContext({ type: 'text.document', locator: 'hello' });
