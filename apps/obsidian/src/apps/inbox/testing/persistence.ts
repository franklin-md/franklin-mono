import type { SingleFilePersister } from '@franklin/lib';
import type { InboxDocument } from '../controller/types.js';

export function createInboxTestPersistence(initial?: InboxDocument) {
	let value = initial;
	const disk: SingleFilePersister<InboxDocument> = {
		save: async (next) => {
			value = structuredClone(next);
		},
		load: async () => ({
			value: value ? structuredClone(value) : undefined,
			issues: [],
		}),
		delete: async () => {
			value = undefined;
		},
	};
	return { disk, read: () => value };
}
