import type { Fetch, WebFetchResponse } from '@franklin/lib';

import type { OAuthCredentials } from '../credentials.js';

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

type Encoding = 'json' | 'form';

export type TokenRequestOptions = {
	url: string;
	body: Record<string, string>;
	encoding: Encoding;
	providerLabel: string;
	getAccountId?(accessToken: string): string | undefined;
};

export async function postOAuthTokenRequest(
	fetch: Fetch,
	options: TokenRequestOptions,
): Promise<OAuthCredentials> {
	const { url, body, encoding, providerLabel } = options;

	const contentType = getContentType(encoding);
	const encodedBody = getEncodedBody(encoding, body);

	const response = await fetch({
		url,
		method: 'POST',
		headers: { 'Content-Type': contentType, Accept: 'application/json' },
		body: encodedBody,
	});

	const parsed = parseResponse(response, providerLabel);

	const accountId = options.getAccountId?.(parsed.access_token);

	return {
		access: parsed.access_token,
		refresh: parsed.refresh_token,
		expires: Date.now() + parsed.expires_in * 1000 - EXPIRY_BUFFER_MS,
		...(accountId !== undefined ? { accountId } : {}),
	};
}

function getContentType(encoding: Encoding): string {
	switch (encoding) {
		case 'json':
			return 'application/json';
		case 'form':
			return 'application/x-www-form-urlencoded';
	}
}

function getEncodedBody(
	encoding: Encoding,
	body: Record<string, string>,
): Uint8Array {
	switch (encoding) {
		case 'json':
			return new TextEncoder().encode(JSON.stringify(body));
		case 'form':
			return new TextEncoder().encode(new URLSearchParams(body).toString());
	}
}

type ParsedResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

function parseResponse(
	response: WebFetchResponse,
	providerLabel: string,
): ParsedResponse {
	const bodyText = new TextDecoder().decode(response.body);
	if (response.status < 200 || response.status >= 300) {
		throw new Error(
			`${providerLabel} token request failed (${response.status}): ${bodyText}`,
		);
	}

	let data: {
		access_token?: unknown;
		refresh_token?: unknown;
		expires_in?: unknown;
	};
	try {
		data = JSON.parse(bodyText) as typeof data;
	} catch (error) {
		throw new Error(
			`${providerLabel} token response was not JSON: ${bodyText}`,
			{
				cause: error,
			},
		);
	}

	const { access_token, refresh_token, expires_in } = data;
	const problems: string[] = [];
	if (typeof access_token !== 'string') problems.push('access_token');
	if (typeof refresh_token !== 'string') problems.push('refresh_token');
	if (typeof expires_in !== 'number') problems.push('expires_in');
	if (
		typeof access_token !== 'string' ||
		typeof refresh_token !== 'string' ||
		typeof expires_in !== 'number'
	) {
		throw new Error(
			`${providerLabel} token response missing or mistyped fields: ${problems.join(', ')}`,
		);
	}
	return { access_token, refresh_token, expires_in };
}
