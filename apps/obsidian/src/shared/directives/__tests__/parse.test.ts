import { describe, expect, it } from 'vitest';
import { parseDirectives } from '../syntax/parse.js';

const token = ':::franklin:quick-add:11111111-1111-4111-8111-111111111111:::';

describe('directive syntax', () => {
	it('finds repeated inline references with source offsets', () => {
		const text = `before ${token} after ${token}`;
		const matches = parseDirectives(text);
		expect(matches).toHaveLength(2);
		expect(matches[0]).toMatchObject({
			name: 'quick-add',
			id: '11111111-1111-4111-8111-111111111111',
			from: 7,
		});
		for (const match of matches)
			expect(text.slice(match.from, match.to)).toBe(token);
	});

	it('preserves literal examples and returns the offset after an escaped backslash', () => {
		const examples = [
			`[link](https://example.test/${token})`,
			`<span title="${token}">example</span>`,
			`\\${token}`,
		].join('\n\n');
		const text = `${examples}\n\n\\\\${token}`;
		expect(parseDirectives(text).map(({ from }) => from)).toEqual([
			text.lastIndexOf(token),
		]);
	});

	it.each(['---', '...'])(
		'ends empty frontmatter at the first %s delimiter',
		(end) => {
			const source = ['---', end, '', token, '', '---', 'Footer'].join('\r\n');
			expect(parseDirectives(source).map((match) => match.from)).toEqual([
				source.indexOf(token),
			]);
		},
	);

	it('ignores code, frontmatter, escaped examples, and incomplete syntax', () => {
		const text = `---\nexample: ${token}\n---\n\n\`${token}\`\n\n~~~md\n${token}\n~~~\n\n    ${token}\n\n\\${token}\n\n:::franklin:bad name:x:::\n${token}`;
		expect(parseDirectives(text)).toHaveLength(1);
		expect(parseDirectives(':::franklin:quick-add:')).toEqual([]);
	});
});
