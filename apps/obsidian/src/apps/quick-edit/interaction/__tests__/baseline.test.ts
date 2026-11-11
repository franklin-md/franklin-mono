import { describe, expect, it } from 'vitest';
import { editMetadataBaseline } from '../baseline.js';

describe('quick edit review bookkeeping', () => {
	it('removes a control without accepting an existing agent edit', () => {
		const source = 'changed text [control]\nnext';
		expect(
			editMetadataBaseline(source, 'original text [control]\nnext', [
				{ from: 12, to: 22, text: '' },
			]),
		).toBe('original text\nnext');
	});
	it('adds UI text inside an agent-modified line without accepting the line', () => {
		expect(
			editMetadataBaseline('new words', 'old words', [
				{ from: 4, to: 4, text: '[edit]' },
			]),
		).toBe('old [edit]words');
	});
});
