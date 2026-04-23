import { describe, expect, it } from 'vitest';

import { htmlResponse } from '../response.js';

describe('htmlResponse', () => {
	it('sets status, HTML content-type, and embeds the message', () => {
		const response = htmlResponse(200, 'Hello');
		expect(response.status).toBe(200);
		expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8');
		expect(response.body).toContain('<p>Hello</p>');
		expect(response.body).toMatch(/^<!doctype html>/);
	});

	it('escapes HTML-sensitive characters in the message', () => {
		const response = htmlResponse(400, '<script>"&"</script>');
		expect(response.body).toContain(
			'&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;',
		);
		expect(response.body).not.toContain('<script>');
	});

	it('escapes ampersands first so existing entities are not double-escaped into lies', () => {
		// Guards the classic "&amp; → &amp;amp;" bug: the replace order in
		// escapeHtml must handle `&` before other entities. A raw `&` passes
		// through as `&amp;`, and that `&amp;` must not be touched again.
		const response = htmlResponse(400, 'A & B');
		expect(response.body).toContain('A &amp; B');
		expect(response.body).not.toContain('&amp;amp;');
	});
});
