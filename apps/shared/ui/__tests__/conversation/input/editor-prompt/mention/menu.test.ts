import { describe, expect, it } from 'vitest';

import { getMentionMenuStyle } from '../../../../../src/conversation/input/editor-prompt/mention/menu.js';

describe('getMentionMenuStyle', () => {
	it('keeps the anchored menu inside the viewport gutter', () => {
		const style = getMentionMenuStyle(new DOMRect(790, 20, 0, 20), 800);

		expect(style).toMatchObject({
			position: 'fixed',
			top: 46,
			left: 472,
			width: 320,
		});
	});
});
