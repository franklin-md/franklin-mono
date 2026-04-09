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

export type WebFetchRequest = {
	url: string;
	timeoutMs?: number;
	maxResponseBytes?: number;
	maxRedirects?: number;
};
