export interface NetworkPermissions {
	allowedDomains: string[];
	deniedDomains: string[];
}

export type WebFetchMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD';

export type WebFetchRequest = {
	url: string;
	method: WebFetchMethod;
	headers?: Record<string, string>;
	body?: Uint8Array;
	// Absolute Unix time in milliseconds, shared by every redirect hop. A number
	// crosses Electron IPC; each transport creates its own cancellation signal.
	deadline?: number;
	// Per-hop limit for connection setup and silence between headers/body chunks.
	// Transports reset it when data arrives; deadline still caps the entire chain.
	idleTimeoutMs?: number;
	maxResponseBytes?: number;
};

export type WebFetchResponse = {
	url: string;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: Uint8Array;
};

export type Fetch = (request: WebFetchRequest) => Promise<WebFetchResponse>;

// TODO(FRA-239): Rename this interface to NetworkAPI.
export interface WebAPI {
	fetch: Fetch;
}
