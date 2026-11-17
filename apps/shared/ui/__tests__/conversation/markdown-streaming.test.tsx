// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Markdown } from '../../src/conversation/turn/markdown.js';

afterEach(cleanup);

const hostOptions = {
	sanitize: { protocols: { href: ['example-app'] } },
	customElements: { 'host-note': { component: () => null } },
	remarkPlugins: [() => () => undefined],
};

describe('Markdown streaming', () => {
	it.each([
		{ name: 'default configuration', options: {} },
		{ name: 'host extensions', options: hostOptions },
	])('does not reprocess completed blocks with $name', async ({ options }) => {
		const processCompleted = vi.fn();
		const rehypePlugins = [
			() => (tree: unknown) => {
				if (JSON.stringify(tree).includes('Completed paragraph.')) {
					processCompleted();
				}
			},
		];
		const { getByText, rerender } = render(
			<Markdown
				text={'Completed paragraph.\n\nStreaming'}
				{...options}
				rehypePlugins={rehypePlugins}
			/>,
		);
		await waitFor(() => expect(getByText('Streaming')).toBeTruthy());
		const completedParses = processCompleted.mock.calls.length;
		expect(completedParses).toBeGreaterThan(0);

		rerender(
			<Markdown
				text={'Completed paragraph.\n\nStreaming tokens.'}
				{...options}
				rehypePlugins={rehypePlugins}
			/>,
		);

		await waitFor(() => expect(getByText('Streaming tokens.')).toBeTruthy());
		expect(processCompleted).toHaveBeenCalledTimes(completedParses);
	});

	it('uses updated host configuration for newly streamed content', async () => {
		const { container, getByRole, rerender } = render(
			<Markdown text="Streaming" />,
		);
		expect(container.querySelector('a')).toBeNull();

		rerender(
			<Markdown
				text={'Streaming\n\n[Open](example-app://open)'}
				sanitize={hostOptions.sanitize}
			/>,
		);

		await waitFor(() =>
			expect(getByRole('link', { name: 'Open' }).getAttribute('href')).toBe(
				'example-app://open',
			),
		);
	});
});
