// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Markdown } from '../../src/conversation/turn/markdown.js';

interface ParentNode {
	children: MarkdownNode[];
}

interface TextNode {
	type: 'text';
	value: string;
}

type MarkdownNode = ParentNode | TextNode | Record<string, unknown>;

function isParentNode(node: unknown): node is ParentNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'children' in node &&
		Array.isArray(node.children)
	);
}

function isTextNode(node: unknown): node is TextNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'type' in node &&
		node.type === 'text' &&
		'value' in node &&
		typeof node.value === 'string'
	);
}

function replaceHelloPlugin() {
	return function transform(tree: unknown) {
		const visit = (node: unknown) => {
			if (isTextNode(node)) {
				node.value = node.value.replaceAll('hello', 'changed');
				return;
			}

			if (!isParentNode(node)) return;
			for (const child of node.children) visit(child);
		};

		visit(tree);
	};
}

describe('Markdown', () => {
	afterEach(cleanup);

	it('defaults wrapper className to "prose-content"', () => {
		const { container } = render(<Markdown text="hello" />);
		const wrapper = container.firstElementChild;
		expect(wrapper).not.toBeNull();
		expect(wrapper?.classList.contains('prose-content')).toBe(true);
	});

	it('uses the provided className for the wrapper', () => {
		const { container } = render(
			<Markdown text="hello" className="markdown-obsidian" />,
		);
		const wrapper = container.firstElementChild;
		expect(wrapper).not.toBeNull();
		expect(wrapper?.className).toBe('markdown-obsidian');
	});

	it('renders headings, paragraphs, lists, and blockquote without inline classes on those elements', () => {
		const text = [
			'# Heading',
			'',
			'A paragraph.',
			'',
			'- item one',
			'- item two',
			'',
			'> a quote',
		].join('\n');
		const { container } = render(<Markdown text={text} />);

		const h1 = container.querySelector('h1');
		const p = container.querySelector('p');
		const ul = container.querySelector('ul');
		const li = container.querySelector('li');
		const blockquote = container.querySelector('blockquote');

		expect(h1).not.toBeNull();
		expect(p).not.toBeNull();
		expect(ul).not.toBeNull();
		expect(li).not.toBeNull();
		expect(blockquote).not.toBeNull();

		// Bare-component renderers must not attach class attributes.
		expect(h1?.getAttribute('class')).toBeNull();
		expect(p?.getAttribute('class')).toBeNull();
		expect(ul?.getAttribute('class')).toBeNull();
		expect(li?.getAttribute('class')).toBeNull();
		expect(blockquote?.getAttribute('class')).toBeNull();
		expect(container.querySelector('[node]')).toBeNull();
	});

	it('applies host remark plugins while preserving default GFM parsing', () => {
		const { container } = render(
			<Markdown
				text="hello from ~~markdown~~"
				remarkPlugins={[replaceHelloPlugin]}
			/>,
		);

		expect(container.textContent).toContain('changed from markdown');
		expect(container.querySelector('del')?.textContent).toBe('markdown');
	});

	it('does not wrap block image markdown in a paragraph', () => {
		const { container } = render(
			<Markdown text="![alt text](https://example.com/image.png)" />,
		);

		const imageWrapper = container.querySelector(
			'[data-streamdown="image-wrapper"]',
		);
		expect(imageWrapper).not.toBeNull();
		expect(imageWrapper?.parentElement?.tagName).not.toBe('P');
		expect(container.querySelector('[node]')).toBeNull();
	});
});
