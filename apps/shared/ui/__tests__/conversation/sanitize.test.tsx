// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Markdown } from '../../src/conversation/turn/markdown.js';

afterEach(cleanup);

function createNoteSanitization() {
	return {
		tagNames: ['note-ref'],
		attributes: { 'note-ref': ['path'] },
		protocols: { href: ['example-app'] },
	};
}

describe('Markdown sanitization extensions', () => {
	it('combines custom tags, attributes and protocols while rejecting unsafe content', () => {
		const href = 'example-app://open';
		const { container, getByRole } = render(
			<Markdown
				text={[
					'<note-ref path="Notes.md" onclick="alert(1)" data-blocked="stripped">Read</note-ref>',
					'',
					`[Open](${href}) and [Web](https://example.com/docs)`,
					'',
					'<script>alert(1)</script>',
					'',
					'[Unsafe](javascript:alert%281%29)',
				].join('\n')}
				sanitize={createNoteSanitization()}
			/>,
		);

		const note = container.querySelector('note-ref');
		expect(note?.textContent).toBe('Read');
		expect(note?.getAttribute('path')).toBe('Notes.md');
		expect(note?.getAttribute('onclick')).toBeNull();
		expect(note?.getAttribute('data-blocked')).toBeNull();
		expect(getByRole('link', { name: 'Open' }).getAttribute('href')).toBe(href);
		expect(getByRole('link', { name: 'Web' }).getAttribute('href')).toBe(
			'https://example.com/docs',
		);
		expect(container.querySelector('script')).toBeNull();
		expect(container.textContent).toContain('Unsafe [blocked]');
	});

	it('extends attributes of existing tags without removing their defaults', () => {
		const { getByRole } = render(
			<Markdown
				text='<a href="https://example.com/docs" data-app="retained" onclick="alert(1)">Web</a>'
				sanitize={{ attributes: { a: ['dataApp'] } }}
			/>,
		);

		const link = getByRole('link', { name: 'Web' });
		expect(link.getAttribute('href')).toBe('https://example.com/docs');
		expect(link.getAttribute('data-app')).toBe('retained');
		expect(link.getAttribute('onclick')).toBeNull();
	});

	it('merges permitted attribute values with the default value rules', () => {
		const { container } = render(
			<Markdown
				text='<code class="language-js host-code blocked">example</code>'
				sanitize={{ attributes: { code: [['className', 'host-code']] } }}
			/>,
		);

		const code = container.querySelector('code');
		expect(code?.classList.contains('language-js')).toBe(true);
		expect(code?.classList.contains('host-code')).toBe(true);
		expect(code?.classList.contains('blocked')).toBe(false);
	});

	it('allows an unrestricted attribute extension without removing other defaults', () => {
		const { container } = render(
			<Markdown
				text='<code class="host-code" onclick="alert(1)">example</code>'
				sanitize={{ attributes: { code: ['className'] } }}
			/>,
		);

		expect(
			container.querySelector('code')?.classList.contains('host-code'),
		).toBe(true);
		expect(container.querySelector('[onclick]')).toBeNull();
	});

	it('does not share host extensions with unconfigured renderers', () => {
		const text =
			'<note-ref path="Notes.md">Read</note-ref>\n\n[Open](example-app://open)';
		const configured = render(
			<Markdown text={text} sanitize={createNoteSanitization()} />,
		);
		const plain = render(<Markdown text={text} />);

		expect(configured.container.querySelector('note-ref')).not.toBeNull();
		expect(configured.container.querySelector('a')).not.toBeNull();
		expect(plain.container.querySelector('note-ref')).toBeNull();
		expect(plain.container.querySelector('a')).toBeNull();
		expect(plain.container.textContent).toContain('Open [blocked]');
	});
});
