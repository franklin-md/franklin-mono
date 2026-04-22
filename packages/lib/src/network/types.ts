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
};

export type WebFetchResponse = {
	url: string;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: Uint8Array;
};

export type Fetch = (request: WebFetchRequest) => Promise<WebFetchResponse>;

export type FetchDecorator = (next: Fetch) => Fetch;

// TODO(FRA-239): Rename this interface to NetworkAPI.
export interface WebAPI {
	fetch: Fetch;
}
