export function displayUrl(urlString: string) {
	let hostname = urlString;
	let path = '';

	try {
		const url = new URL(urlString);
		hostname = url.hostname;
		path = url.pathname === '/' ? '' : url.pathname;
	} catch {
		/* use raw url as hostname */
	}

	return { hostname, path };
}

export function faviconUrl(hostname: string) {
	return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
}
