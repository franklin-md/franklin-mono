import type { ServerResponse } from 'node:http';

import type { LoopbackResponse } from '@franklin/lib';

export function writeResponse(
	response: ServerResponse,
	payload: LoopbackResponse,
): void {
	response.statusCode = payload.status;
	if (payload.headers) {
		for (const [key, value] of Object.entries(payload.headers)) {
			response.setHeader(key, value);
		}
	}
	response.end(payload.body ?? '');
}
