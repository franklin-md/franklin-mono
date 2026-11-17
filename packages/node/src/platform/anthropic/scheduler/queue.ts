import type { Request } from './types.js';

export class RequestQueue {
	private readonly pending: Request[] = [];

	enqueue(request: Request): void {
		this.pending.push(request);
	}

	peek(): Request | undefined {
		return this.pending[0];
	}

	take(request: Request): void {
		const index = this.pending.indexOf(request);
		if (index !== -1) this.pending.splice(index, 1);
	}

	rejectAll(error: unknown): void {
		for (const request of this.pending.splice(0)) request.reject(error);
	}
}
