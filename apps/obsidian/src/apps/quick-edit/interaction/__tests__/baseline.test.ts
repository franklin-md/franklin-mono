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
	it('does not replace baseline text when inserting a control inside a changed word', () => {
		const edits = [{ from: 1, to: 1, text: '[control]' }];
		const baseline = editMetadataBaseline('new words', 'old words', edits);
		expect(baseline.replace('[control]', '')).toBe('old words');
		expect(
			editMetadataBaseline('n[control]ew words', baseline, [
				{ from: 1, to: 10, text: '' },
			]),
		).toBe('old words');
	});
});
