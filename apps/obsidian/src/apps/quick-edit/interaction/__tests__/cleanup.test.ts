import { describe, expect, it } from 'vitest';
import { quickEditCleanup } from '../cleanup.js';

const reference = {
	name: 'quick-edit',
	id: '11111111-1111-4111-8111-111111111111',
};
const token = `:::franklin:quick-edit:${reference.id}:::`;

function clean(input: string) {
	const source = input.replaceAll('[request]', token);
	return quickEditCleanup(source, reference).reduceRight(
		(current, { from, to, text }) =>
			current.slice(0, from) + text + current.slice(to),
		source,
	);
}

describe('successful request content cleanup', () => {
	it.each([
		['[request]', ''],
		['[request]\nprose', 'prose'],
		['prose\n[request]', 'prose'],
		['prose\r\n[request]', 'prose'],
		['before\r\n[request]\r\nafter', 'before\r\nafter'],
		['before\n  [request] \nafter', 'before\nafter'],
		['before\n\n[request]\n\nafter', 'before\n\n\nafter'],
		['before [request] after', 'before  after'],
		['- [request]\n- sibling', '- sibling'],
		['1. [request]', ''],
		['- parent\n  - [request]\n  - sibling', '- parent\n  - sibling'],
		[
			'- parent\n  - [request]\n    - child\n      - grandchild\n  - sibling',
			'- parent\n  - child\n    - grandchild\n  - sibling',
		],
		[
			'10. [request]\n    - child\n      continued\n11. sibling',
			'- child\n  continued\n11. sibling',
		],
		['- [ ] [request]\n  - child', '- child'],
		['- [request]\n\t- child\n\t\t- grandchild', '  - child\n\t  - grandchild'],
		[
			'- [request]\n  prose\n\n  paragraph\n- sibling',
			'prose\n\nparagraph\n- sibling',
		],
		[
			'- [request]\n  ```\n  code\n  ```\n- sibling',
			'```\ncode\n```\n- sibling',
		],
		['- prose [request]\n  - child', '- prose \n  - child'],
	])('cleans %j without deleting note content', (source, expected) => {
		expect(clean(source)).toBe(expected);
	});

	it('removes a restored multiline query envelope without consuming suffix prose', () => {
		expect(
			clean(
				`[request]first\nsecond<!--franklin-quick-edit-end:${reference.id}--> suffix`,
			),
		).toBe(' suffix');
	});
	it('does not select one ambiguous copy or treat missing controls as content', () => {
		expect(() => clean('[request]\n[request]')).toThrow('exactly one');
		expect(clean('unchanged')).toBe('unchanged');
	});
});
