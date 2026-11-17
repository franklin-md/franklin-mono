import { normalizeHost } from './normalize-host.js';
import { isPrivateHost } from './is-private-host.js';

export function normalizeUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('Only HTTP and HTTPS URLs are supported');
	}
	if (
		url.protocol === 'http:' &&
		!isPrivateHost(normalizeHost(url.hostname) ?? url.hostname)
	) {
		url.protocol = 'https:';
	}
	url.hash = '';
	return url.toString();
}
