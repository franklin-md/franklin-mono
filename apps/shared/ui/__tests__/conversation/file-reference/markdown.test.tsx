// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';

import { referenceMentionMarkdown } from '../../../src/conversation/file-reference/markdown.js';
import {
	REFERENCE_MENTION_ATTRIBUTE,
	REFERENCE_MENTION_ELEMENT_NAME,
	remarkReferenceMentions,
} from '../../../src/conversation/file-reference/remark.js';
import { Markdown } from '../../../src/conversation/turn/markdown.js';

function CapturedReference({ reference }: { readonly reference: string }) {
	return <span data-reference={reference} data-testid="captured-reference" />;
}

describe('referenceMentionMarkdown', () => {
	afterEach(cleanup);

	it('renders canonical file reference tokens as file badges', () => {
		const mention = formatReferenceMention({
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		});
		const { container } = render(
			<Markdown text={`Read ${mention} next`} {...referenceMentionMarkdown} />,
		);

		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(container.textContent).toContain('Read ');
		expect(container.textContent).toContain(' next');
		expect(container.textContent).not.toContain(mention);
	});

	it('passes reference payloads to rendered custom elements', () => {
		const reference = {
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'Deep Work',
		};
		const mention = formatReferenceMention(reference);

		render(
			<Markdown
				text={`Read ${mention}`}
				remarkPlugins={[remarkReferenceMentions]}
				customElements={{
					[REFERENCE_MENTION_ELEMENT_NAME]: {
						allowedAttributes: [REFERENCE_MENTION_ATTRIBUTE],
						component: CapturedReference,
					},
				}}
			/>,
		);

		expect(
			screen.getByTestId('captured-reference').getAttribute('data-reference'),
		).toBe(mention);
	});

	it('preserves non-file reference mentions as text', () => {
		const mention = formatReferenceMention({
			type: 'text',
			locator: 'inline context',
			label: 'Inline Context',
		});
		const { container } = render(
			<Markdown text={`Read ${mention}`} {...referenceMentionMarkdown} />,
		);

		expect(container.textContent).toContain(mention);
		expect(screen.queryByText('Inline Context')).toBeNull();
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
				{...referenceMentionMarkdown}
			/>,
		);

		expect(container.querySelector('del')?.textContent).toBe('this');
		expect(screen.getByText('deep work.md')).toBeTruthy();
	});
});
