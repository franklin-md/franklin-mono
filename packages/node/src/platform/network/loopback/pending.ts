import type { ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import type { LoopbackResponse } from '@franklin/lib';
import { writeResponse } from './respond.js';

export interface PendingRegistry {
	track(response: ServerResponse): string;
	respond(id: string, payload: LoopbackResponse): void;
	clear(id: string): void;
	destroyAll(): void;
}

export function createPendingRegistry(): PendingRegistry {
	const entries = new Map<string, ServerResponse>();

	return {
		track(response) {
			const id = randomUUID();
			entries.set(id, response);
			return id;
		},
		respond(id, payload) {
			const response = entries.get(id);
			if (!response) throw new Error(`unknown request id: ${id}`);
			entries.delete(id);
			writeResponse(response, payload);
		},
		clear(id) {
			entries.delete(id);
		},
		destroyAll() {
			for (const response of entries.values()) response.destroy();
			entries.clear();
		},
	};
}
