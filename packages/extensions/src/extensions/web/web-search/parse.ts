import { singleLine } from '../utils.js';
import type { WebSearchResult } from './types.js';

// DDG lite layout: each result is a pair of table rows — one containing
// <a class="result-link"> and a following row with <td class="result-snippet">.
// We parse with DOMParser to avoid hand-rolled HTML scanning; this mirrors
// how web-fetch/process.ts consumes HTML responses.

export function parseDdgLite(
	html: string,
	maxResults: number,
): WebSearchResult[] {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const links = doc.querySelectorAll('a.result-link');

	const results: WebSearchResult[] = [];
	for (const link of Array.from(links)) {
		if (results.length >= maxResults) break;

		const title = singleLine(link.textContent);
		const href = link.getAttribute('href') ?? '';
		const url = unwrapDdgRedirect(href);
		if (title === '' || url === '') continue;

		results.push({ title, url, snippet: findSnippetFor(link) });
	}

	return results;
}

function findSnippetFor(link: Element): string {
	// The snippet <td> lives in a sibling row a few hops below the link's row.
	const row = link.closest('tr');
	if (!row) return '';

	let cursor: Element | null = row.nextElementSibling;
	let hops = 0;
	while (cursor && hops < 4) {
		const cell = cursor.querySelector('td.result-snippet');
		if (cell) return singleLine(cell.textContent);
		cursor = cursor.nextElementSibling;
		hops++;
	}
	return '';
}

function unwrapDdgRedirect(href: string): string {
	if (href === '') return '';
	try {
		const parsed = new URL(href, 'https://duckduckgo.com');
		if (parsed.pathname === '/l/' || parsed.pathname === '/l') {
			const target = parsed.searchParams.get('uddg');
			if (target) return decodeURIComponent(target);
		}
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
			return parsed.toString();
		}
		return '';
	} catch {
		return '';
	}
}
