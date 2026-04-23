export interface ListenLoopbackOptions {
	host?: string;
	port?: number;
	path?: string;
}

export interface LoopbackRequest {
	id: string;
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: string;
}

export interface LoopbackResponse {
	status: number;
	headers?: Record<string, string>;
	body?: string;
}

export interface LoopbackListener {
	getRedirectUri(): Promise<string>;
	onRequest(callback: (request: LoopbackRequest) => void): () => void;
	respond(id: string, response: LoopbackResponse): Promise<void>;
	dispose(): Promise<void>;
}
