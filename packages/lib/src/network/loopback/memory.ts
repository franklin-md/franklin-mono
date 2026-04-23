import type {
	LoopbackListener,
	LoopbackRequest,
	LoopbackResponse,
} from './types.js';

export interface EmittedLoopbackRequest {
	request: LoopbackRequest;
	responses: LoopbackResponse[];
}

export interface MemoryLoopbackListenerOptions {
	host?: string;
	port?: number;
	path?: string;
}

export class MemoryLoopbackListener implements LoopbackListener {
	private readonly subscribers = new Set<(request: LoopbackRequest) => void>();
	private readonly pending: LoopbackRequest[] = [];
	readonly emitted: EmittedLoopbackRequest[] = [];
	disposed = false;
	host: string;
	boundPort: number;
	path: string;

	constructor(options: MemoryLoopbackListenerOptions = {}) {
		this.host = options.host ?? '127.0.0.1';
		this.boundPort = options.port ?? 9999;
		this.path = options.path ?? '/callback';
	}

	async getRedirectUri(): Promise<string> {
		return `http://${this.host}:${this.boundPort}${this.path}`;
	}

	onRequest(callback: (request: LoopbackRequest) => void): () => void {
		this.subscribers.add(callback);
		const buffered = this.pending.splice(0, this.pending.length);
		for (const request of buffered) callback(request);
		return () => this.subscribers.delete(callback);
	}

	async respond(id: string, response: LoopbackResponse): Promise<void> {
		const record = this.emitted.find((e) => e.request.id === id);
		if (record) record.responses.push(response);
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.subscribers.clear();
	}

	simulate(query: string, id = 'req-1'): void {
		this.simulateUrl(`${this.path}${query}`, id);
	}

	simulateUrl(pathAndQuery: string, id = 'req-1'): void {
		const request: LoopbackRequest = {
			id,
			method: 'GET',
			url: `http://${this.host}:${this.boundPort}${pathAndQuery}`,
			headers: {},
		};
		this.emitted.push({ request, responses: [] });
		if (this.subscribers.size === 0) {
			this.pending.push(request);
			return;
		}
		for (const sub of this.subscribers) sub(request);
	}
}
