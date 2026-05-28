// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { fileReferenceMarkdown } from '../../../src/conversation/file-reference/markdown.js';
import { Markdown } from '../../../src/conversation/turn/markdown.js';

describe('fileReferenceMarkdown', () => {
	afterEach(cleanup);

	it('renders canonical file reference tokens as file badges', () => {
		const { container } = render(
			<Markdown
				text="Read @{notes/deep work.md} next"
				{...fileReferenceMarkdown}
			/>,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(container.textContent).toContain('Read ');
		expect(container.textContent).toContain(' next');
		expect(container.textContent).not.toContain('@{notes/deep work.md}');
	});

	it('preserves normal markdown parsing around file references', () => {
		const { container } = render(
			<Markdown
				text="Read ~~this~~ and @{notes/deep work.md}"
				{...fileReferenceMarkdown}
			/>,
		);

		expect(container.querySelector('del')?.textContent).toBe('this');
		expect(screen.getByText('deep work.md')).toBeTruthy();
	});
});
