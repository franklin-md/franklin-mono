export interface NetworkPermissions {
	allowedDomains: string[];
	deniedDomains: string[];
}

export type WebFetchResponse = {
	requestedUrl: string;
	finalUrl: string;
	status: number;
	statusText: string;
	contentType?: string;
	headers: Record<string, string>;
	body: Uint8Array;
};

// FRA-149: I think eventually we want this to have exactly
// the same configuration parameters as a Node.js fetch
// for maximum freedom on top of our safety model
export type WebFetchRequest = {
	url: string;
	timeoutMs?: number;
	maxRedirects?: number;
	headers?: Record<string, string>;
};
