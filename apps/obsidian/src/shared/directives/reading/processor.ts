import type { MarkdownPostProcessor } from 'obsidian';
import type { DirectiveRegistry } from '../registry.js';
import { scanDirectives } from '../syntax/scan.js';
import type { DirectiveToken } from '../syntax/types.js';
import { parseDirectives } from '../syntax/parse.js';
import { formatDirective } from '../syntax/format.js';
import { DirectiveRenderChild } from './child.js';
import { countDirectives } from './count.js';

export function createDirectivePostProcessor(
	registry: DirectiveRegistry,
): MarkdownPostProcessor {
	return (element, context) => {
		const document = element.ownerDocument;
		const filter = document.defaultView?.NodeFilter;
		if (!filter) return;
		const section = context.getSectionInfo(element);
		if (!section) return;
		const candidates: { node: Text; tokens: DirectiveToken[] }[] = [];
		const walker = document.createTreeWalker(element, filter.SHOW_TEXT);
		while (walker.nextNode()) {
			const node = walker.currentNode as Text;
			if (node.parentElement?.closest('code, pre, script, style, .franklin'))
				continue;
			const tokens = scanDirectives(node.data);
			if (tokens.length) candidates.push({ node, tokens });
		}
		if (!candidates.length) return;
		const rendered = countDirectives(
			candidates.flatMap(({ tokens }) => tokens),
		);
		const lines = section.text.split('\n');
		const lineOffset = (line: number) =>
			lines
				.slice(0, line)
				.reduce((offset, text) => offset + text.length + 1, 0);
		const from = lineOffset(section.lineStart);
		const to = lineOffset(section.lineEnd + 1);
		const allowed = countDirectives(
			parseDirectives(section.text).filter(
				(token) => token.from >= from && token.to <= to,
			),
		);
		for (const { node, tokens } of candidates) {
			// Markdown removes escaping. If source and DOM counts disagree, an
			// escaped example may be indistinguishable from a real reference. Keep
			// those tokens readable instead of mounting a widget over the wrong text.
			const matches = tokens.filter(({ name, id }) => {
				const key = formatDirective(name, id);
				return allowed.get(key) === rendered.get(key);
			});
			if (matches.length === 0) continue;
			const fragment = document.createDocumentFragment();
			let offset = 0;
			const children: DirectiveRenderChild[] = [];
			for (const token of matches) {
				fragment.append(node.data.slice(offset, token.from));
				const host = document.createElement('span');
				fragment.append(host);
				children.push(new DirectiveRenderChild(host, registry, token));
				offset = token.to;
			}
			fragment.append(node.data.slice(offset));
			node.replaceWith(fragment);
			for (const child of children) context.addChild(child);
		}
	};
}
