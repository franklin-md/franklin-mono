// @vitest-environment jsdom

import type { ReactNode } from 'react';
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

function customElementPlugin() {
	return function transform(tree: unknown) {
		if (!isParentNode(tree)) return;

		tree.children = [
			{
				type: 'customElement',
				data: {
					hName: 'test-element',
					hProperties: {
						dataBlocked: 'stripped',
						dataValue: 'preserved',
					},
				},
				children: [{ type: 'text', value: 'Custom body' }],
			},
		];
	};
}

function typedCustomElementPlugin() {
	return function transform(tree: unknown) {
		if (!isParentNode(tree)) return;

		tree.children = [
			{
				type: 'customElement',
				data: {
					hName: 'test-element',
					hProperties: {
						path: 'notes/deep work.md',
					},
				},
				children: [],
			},
		];
	};
}

function remendHello(text: string) {
	return text.replace('hello', 'remended');
}

function TestElement({
	children,
	'data-blocked': dataBlockedAttribute,
	'data-value': dataValueAttribute,
	dataBlocked,
	dataValue,
	node: _node,
}: Record<string, unknown> & { children?: ReactNode }) {
	const blocked = getString(dataBlocked ?? dataBlockedAttribute);
	const value = getString(dataValue ?? dataValueAttribute);

	return (
		<span data-blocked={blocked} data-rendered-custom="" data-value={value}>
			{children}
		</span>
	);
}

function getString(value: unknown) {
	return typeof value === 'string' ? value : undefined;
}

function TypedElement({ path }: { readonly path: string }) {
	return <span data-path={path} data-rendered-typed="" />;
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

	it('renders declared custom elements with their allowed attributes', () => {
		const { container } = render(
			<Markdown
				text="hello"
				customElements={{
					'test-element': {
						allowedAttributes: ['dataValue'],
						component: TestElement,
					},
				}}
				remarkPlugins={[customElementPlugin]}
			/>,
		);

		const customElement = container.querySelector('[data-rendered-custom]');
		expect(customElement).not.toBeNull();
		expect(customElement?.textContent).toBe('Custom body');
		expect(customElement?.getAttribute('data-value')).toBe('preserved');
		expect(customElement?.getAttribute('data-blocked')).toBeNull();
	});

	it('accepts typed custom element components', () => {
		const { container } = render(
			<Markdown
				text="hello"
				customElements={{
					'test-element': {
						allowedAttributes: ['path'],
						component: TypedElement,
					},
				}}
				remarkPlugins={[typedCustomElementPlugin]}
			/>,
		);

		const customElement = container.querySelector('[data-rendered-typed]');
		expect(customElement).not.toBeNull();
		expect(customElement?.getAttribute('data-path')).toBe('notes/deep work.md');
	});

	it('does not render custom component mappings for undeclared custom elements', () => {
		const { container } = render(
			<Markdown
				text="hello"
				components={{ 'test-element': TestElement }}
				remarkPlugins={[customElementPlugin]}
			/>,
		);

		expect(container.querySelector('[data-rendered-custom]')).toBeNull();
	});

	it('applies host remend handlers before markdown parsing', () => {
		const { container } = render(
			<Markdown
				text="hello"
				remend={{
					handlers: [
						{
							name: 'test',
							priority: 0,
							handle: remendHello,
						},
					],
				}}
			/>,
		);

		expect(container.textContent).toContain('remended');
	});

	it('renders fully qualified HTTP(S) markdown links as anchors with favicons', () => {
		const { container } = render(
			<Markdown
				text={[
					'[Secure](https://example.com/docs)',
					'[Insecure](http://example.test/path)',
				].join(' ')}
			/>,
		);

		const links = Array.from(container.querySelectorAll('a'));
		expect(links).toHaveLength(2);
		expect(links[0]?.getAttribute('href')).toBe('https://example.com/docs');
		expect(links[0]?.getAttribute('target')).toBe('_blank');
		expect(links[0]?.getAttribute('rel')).toContain('noreferrer');
		expect(links[0]?.querySelector('img')?.getAttribute('src')).toBe(
			'https://www.google.com/s2/favicons?domain=example.com&sz=64',
		);
		expect(links[1]?.querySelector('img')?.getAttribute('src')).toBe(
			'https://www.google.com/s2/favicons?domain=example.test&sz=64',
		);
	});

	it('does not decorate markdown links that are not fully qualified HTTP(S) URLs', () => {
		const { container } = render(
			<Markdown
				text={[
					'[Relative](/docs)',
					'[Fragment](#heading)',
					'[Email](mailto:hello@example.com)',
					'[Bare](example.com)',
				].join(' ')}
			/>,
		);

		expect(container.querySelector('a[href="/docs"]')).not.toBeNull();
		const fragmentLink = container.querySelector('a[href="#heading"]');
		expect(fragmentLink).not.toBeNull();
		expect(fragmentLink?.getAttribute('target')).toBeNull();
		expect(fragmentLink?.getAttribute('rel')).toBeNull();
		expect(container.querySelector('img')).toBeNull();
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
