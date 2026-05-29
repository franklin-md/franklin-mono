// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';

import { fileReferenceMarkdown } from '../../../src/conversation/file-reference/markdown.js';
import { Markdown } from '../../../src/conversation/turn/markdown.js';

describe('fileReferenceMarkdown', () => {
	afterEach(cleanup);

	it('renders canonical file reference tokens as file badges', () => {
		const mention = formatReferenceMention({
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		});
		const { container } = render(
			<Markdown text={`Read ${mention} next`} {...fileReferenceMarkdown} />,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(container.textContent).toContain('Read ');
		expect(container.textContent).toContain(' next');
		expect(container.textContent).not.toContain(mention);
	});

	it('preserves normal markdown parsing around file references', () => {
		const mention = formatReferenceMention({
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		});
		const { container } = render(
			<Markdown
				text={`Read ~~this~~ and ${mention}`}
				{...fileReferenceMarkdown}
			/>,
		);

		expect(container.querySelector('del')?.textContent).toBe('this');
		expect(screen.getByText('deep work.md')).toBeTruthy();
	});
});
