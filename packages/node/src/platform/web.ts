import { DEFAULT_WEB_FETCH_OPTIONS } from '@franklin/extensions';
import type { NetworkConfig, WebAPI } from '@franklin/extensions';
import type { WebFetchRequest, WebFetchResponse } from '@franklin/lib';
import {
	isLoopbackHost,
	isPrivateHost,
	matchesUrlPattern,
	normalizeHost,
} from './utils.js';

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (compatible; Franklin/0.0; +https://franklin.local)';

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const MAX_RESPONSE_BYTES = 1024 * 1024 * 1024; // 1 GB

type NormalizedRequest = {
	url: URL;
	timeoutMs: number;
	maxRedirects: number;
	headers: Record<string, string>;
};

export class EnvironmentWeb implements WebAPI {
	private config: NetworkConfig;

	constructor(config: NetworkConfig) {
		this.config = config;
	}

	setConfig(config: NetworkConfig): void {
		this.config = config;
	}

	async fetch(request: WebFetchRequest): Promise<WebFetchResponse> {
		const normalized = this.normalizeRequest(request);

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort(new Error(this.timeoutMessage(normalized.timeoutMs)));
		}, normalized.timeoutMs);

		try {
			const response = await this.fetchWithRedirects(normalized, controller);
			const body = await this.readBody(response, controller);
			return {
				requestedUrl: normalized.url.toString(),
				finalUrl: response.url,
				status: response.status,
				statusText: response.statusText,
				contentType: response.headers.get('content-type') ?? undefined,
				headers: Object.fromEntries(response.headers.entries()),
				body,
			};
		} catch (error) {
			if (this.isAbortError(error)) {
				throw new Error(this.timeoutMessage(normalized.timeoutMs), {
					cause: error,
				});
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	}

	private normalizeRequest(request: WebFetchRequest): NormalizedRequest {
		if (request.url.trim() === '') {
			throw new Error('URL is required');
		}

		let url: URL;
		try {
			url = new URL(request.url);
		} catch {
			throw new Error(`Invalid URL: ${request.url}`);
		}

		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new Error('Only HTTP and HTTPS URLs are supported');
		}

		const headers: Record<string, string> = {
			'user-agent': DEFAULT_USER_AGENT,
		};
		if (request.headers) {
			for (const [key, value] of Object.entries(request.headers)) {
				headers[key.toLowerCase()] = value;
			}
		}

		return {
			url,
			timeoutMs: request.timeoutMs ?? DEFAULT_WEB_FETCH_OPTIONS.timeoutMs,
			maxRedirects:
				request.maxRedirects ?? DEFAULT_WEB_FETCH_OPTIONS.maxRedirects,
			headers,
		};
	}

	private assertAllowed(url: URL): void {
		const host = normalizeHost(url.hostname);

		const denied = this.config.deniedDomains.some((pattern) =>
			matchesUrlPattern(pattern, url),
		);
		// TODO: create user request flow for explicit domain approval
		if (denied) {
			throw new Error(`Network access denied for host "${host}"`);
		}

		if (isLoopbackHost(host)) {
			const allowed = this.config.allowedDomains.some((pattern) =>
				matchesUrlPattern(pattern, url),
			);
			if (!allowed) {
				throw new Error(
					`Network access denied for host "${host}": loopback addresses must be explicitly allowlisted`,
				);
			}
			return;
		}

		// Block private/link-local addresses to prevent SSRF.
		// This provides partial mitigation against domain fronting via IP literals
		// (e.g. http://192.168.1.1/). DNS-based fronting via CDN hostnames that
		// resolve to private IPs cannot be caught here.
		if (isPrivateHost(host)) {
			throw new Error(
				`Network access denied for host "${host}"`,
			);
		}

		// TODO: I do not particularly like this default behaviour that if there is no
		// allowed domain then it assumes all domains are allowed.
		if (
			this.config.allowedDomains.length > 0 &&
			!this.config.allowedDomains.some((pattern) =>
				matchesUrlPattern(pattern, url),
			)
		) {
			throw new Error(`Network access denied for host "${host}"`);
		}
	}

	private async fetchWithRedirects(
		request: NormalizedRequest,
		controller: AbortController,
	): Promise<Response> {
		let currentUrl = request.url;

		for (let i = 0; i <= request.maxRedirects; i++) {
			this.assertAllowed(currentUrl);
			const response = await fetch(currentUrl, {
				method: 'GET',
				redirect: 'manual',
				signal: controller.signal,
				credentials: 'omit',
				headers: request.headers,
			});

			if (!REDIRECT_STATUS_CODES.has(response.status)) {
				return response;
			}

			const location = response.headers.get('location');
			if (!location) {
				throw new Error('Redirect response missing Location header');
			}

			currentUrl = new URL(location, currentUrl);
			if (!['http:', 'https:'].includes(currentUrl.protocol)) {
				throw new Error('Only HTTP and HTTPS URLs are supported');
			}
		}

		throw new Error(
			`Redirect limit exceeded (${request.maxRedirects}) for "${request.url.toString()}"`,
		);
	}

	private async readBody(
		response: Response,
		controller: AbortController,
	): Promise<Uint8Array> {
		if (!response.body) {
			return new Uint8Array();
		}

		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let total = 0;
		let truncated = false;

		for (;;) {
			const { value, done } = (await reader.read()) as {
				value: Uint8Array;
				done: boolean;
			};
			if (done) break;

			if (total + value.byteLength > MAX_RESPONSE_BYTES) {
				const remaining = MAX_RESPONSE_BYTES - total;
				if (remaining > 0) {
					chunks.push(value.slice(0, remaining));
					total += remaining;
				}
				truncated = true;
				break;
			}

			total += value.byteLength;
			chunks.push(value);
		}

		if (truncated) {
			controller.abort();
			try {
				await reader.cancel();
			} catch {
				// Ignore cancellation errors from partially-consumed streams.
			}
		}

		const body = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			body.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return body;
	}

	private isAbortError(error: unknown): boolean {
		return error instanceof Error && error.name === 'AbortError';
	}

	private timeoutMessage(timeoutMs: number): string {
		return `Request timed out after ${timeoutMs}ms`;
	}
}
