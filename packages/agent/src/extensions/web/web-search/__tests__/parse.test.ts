// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseDdgLite } from '../parse.js';

describe('parseDdgLite', () => {
	it('extracts title, url, and snippet from ddg lite html', () => {
		const html = `
			<html><body><table>
				<tr><td>
					<a class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Ffoo&amp;rut=abc">Example Foo</a>
				</td></tr>
				<tr><td class="result-snippet">Foo is the first example &amp; friends.</td></tr>
				<tr><td>
					<a class="result-link" href="https://bar.test/page">Bar Page</a>
				</td></tr>
				<tr><td class="result-snippet">Bar describes the second result.</td></tr>
			</table></body></html>
		`;

		const results = parseDdgLite(html, 10);

		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({
			title: 'Example Foo',
			url: 'https://example.com/foo',
			snippet: 'Foo is the first example & friends.',
		});
		expect(results[1]).toEqual({
			title: 'Bar Page',
			url: 'https://bar.test/page',
			snippet: 'Bar describes the second result.',
		});
	});

	it('respects maxResults', () => {
		const row = (i: number) =>
			`<tr><td><a class="result-link" href="https://example.com/${i}">Link ${i}</a></td></tr>` +
			`<tr><td class="result-snippet">Snippet ${i}</td></tr>`;
		const html = `<table>${Array.from({ length: 5 }, (_, i) => row(i)).join('')}</table>`;

		const results = parseDdgLite(html, 3);
		expect(results).toHaveLength(3);
		expect(results[0]?.title).toBe('Link 0');
		expect(results[2]?.title).toBe('Link 2');
	});

	it('returns empty array when no results match', () => {
		expect(parseDdgLite('<html><body>no results</body></html>', 10)).toEqual(
			[],
		);
	});

	it('handles links without snippets', () => {
		const html = `<table><tr><td><a class="result-link" href="https://solo.test/">Solo</a></td></tr></table>`;
		const results = parseDdgLite(html, 10);
		expect(results).toEqual([
			{ title: 'Solo', url: 'https://solo.test/', snippet: '' },
		]);
	});
});
