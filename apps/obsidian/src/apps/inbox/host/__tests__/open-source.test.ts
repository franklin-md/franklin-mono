import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import type { QuestionSource } from '../../types.js';
import { openQuestionSource } from '../open-source.js';

vi.mock('obsidian', () => ({ Notice: vi.fn() }));

const source: QuestionSource = {
	note: 'Sleep',
	heading: 'Locking',
	quote: 'Check the condition again.',
	location: {
		id: 'source',
		path: 'Systems/Sleep.md',
		from: { line: 2, ch: 0 },
		to: { line: 2, ch: 26 },
		context: '',
		capturedAt: 1,
	},
};

function host(content: string) {
	const editor = {
		getValue: vi.fn(() => content),
		offsetToPos: vi.fn((offset: number) => {
			const lines = content.slice(0, offset).split('\n');
			return { line: lines.length - 1, ch: lines.at(-1)?.length ?? 0 };
		}),
		setSelection: vi.fn(),
		scrollIntoView: vi.fn(),
		focus: vi.fn(),
	};
	const file = { path: 'Systems/Sleep.md' };
	const leaf = {
		openFile: vi.fn(async () => {}),
		view: { getViewType: () => 'markdown', editor },
	};
	const app = {
		vault: { getFileByPath: vi.fn((): typeof file | null => file) },
		workspace: { getLeaf: vi.fn(() => leaf) },
	};
	return { app, editor, leaf, file };
}

describe('opening captured Inbox passages', () => {
	it.each([
		{
			name: 'keeps the exact selection at its saved location',
			content: '# Sleep\n## Locking\nCheck the condition again.\nMore context.',
			quote: source.quote,
			line: 2,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 26 },
		},
		{
			name: 're-finds an exact selection after lines are inserted',
			content: 'New intro\n# Sleep\n## Locking\nCheck the condition again.',
			quote: source.quote,
			line: 2,
			from: { line: 3, ch: 0 },
			to: { line: 3, ch: 26 },
		},
		{
			name: 'preserves an exact multiline selection',
			content: '# Sleep\n## Locking\nCheck the condition again.\nMore context.',
			quote: 'Check the condition again.\nMore context.',
			line: 2,
			from: { line: 2, ch: 0 },
			to: { line: 3, ch: 13 },
		},
		{
			name: 'opens the closest exact occurrence when the quote is duplicated',
			content:
				'Check the condition again.\nNew text\nNew text\nCheck the condition again.',
			quote: source.quote,
			line: 2,
			from: { line: 3, ch: 0 },
			to: { line: 3, ch: 26 },
		},
		{
			name: 'handles a saved position beyond the shortened note',
			content:
				'Check the condition again.\nNew text\nCheck the condition again.',
			quote: source.quote,
			line: 100,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 26 },
		},
		{
			name: 'selects the unique prefix line ignoring whitespace',
			content: '# Sleep\n\n  Check  the\tcondition again. Explain why.',
			quote: source.quote,
			line: 0,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 42 },
		},
		{
			name: 'prefers a unique first-line prefix over a longer fuzzy match',
			content: 'alpha\tbeta\n\na_l_p_h_a_b_e_t_a_extra_steps',
			quote: 'alpha beta\nextra steps',
			line: 2,
			from: { line: 0, ch: 0 },
			to: { line: 0, ch: 10 },
		},
		{
			name: 'uses subsequence matching when several prefix lines exist',
			content: 'alpha\tbeta\n\nalpha  beta extra steps updated',
			quote: 'alpha beta\nextra steps',
			line: 0,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 31 },
		},
		{
			name: 'uses the longest common subsequence rather than a contiguous substring',
			content: 'abcdeQ\n\naXbYcZdWeVf',
			quote: 'abcdef',
			line: 0,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 11 },
		},
		{
			name: 'ignores whitespace in subsequences and resolves equal scores by saved line',
			content: 'a-b-c-d-e-f\n\n aX bY cZ dW eV f ',
			quote: 'a b c d e f',
			line: 2,
			from: { line: 2, ch: 0 },
			to: { line: 2, ch: 18 },
		},
	])('$name', async ({ content, quote, line, from, to }) => {
		const { app, editor, leaf, file } = host(content);
		await openQuestionSource(app as unknown as App, {
			...source,
			quote,
			location: { ...source.location!, from: { line, ch: 0 } },
		});
		expect(leaf.openFile).toHaveBeenCalledWith(file);
		expect(editor.setSelection).toHaveBeenCalledWith(from, to);
		expect(editor.scrollIntoView).toHaveBeenCalledWith({ from, to }, true);
		expect(editor.focus).toHaveBeenCalled();
	});

	it('keeps the saved exact occurrence when it appears twice on the same line', async () => {
		const { app, editor } = host('abc abc');
		await openQuestionSource(app as unknown as App, {
			...source,
			quote: 'abc',
			location: { ...source.location!, from: { line: 0, ch: 4 } },
		});
		expect(editor.setSelection).toHaveBeenCalledWith(
			{ line: 0, ch: 4 },
			{ line: 0, ch: 7 },
		);
	});

	it.each(['XYZ', '', ' \t\n '])(
		'still opens the note without selecting unrelated text for quote %j',
		async (quote) => {
			const { app, editor, leaf, file } = host('abc\n\n123');
			await openQuestionSource(app as unknown as App, { ...source, quote });
			expect(leaf.openFile).toHaveBeenCalledWith(file);
			expect(editor.setSelection).not.toHaveBeenCalled();
		},
	);

	it('opens a non-Markdown file without attempting editor navigation', async () => {
		const { app, editor, leaf, file } = host('abc');
		leaf.view.getViewType = () => 'pdf';
		await openQuestionSource(app as unknown as App, source);
		expect(leaf.openFile).toHaveBeenCalledWith(file);
		expect(editor.getValue).not.toHaveBeenCalled();
	});

	it('reports a missing note while preserving the captured quote', async () => {
		vi.mocked(Notice).mockClear();
		const { app, leaf } = host('abc');
		app.vault.getFileByPath.mockReturnValue(null);
		await openQuestionSource(app as unknown as App, source);
		expect(leaf.openFile).not.toHaveBeenCalled();
		expect(Notice).toHaveBeenCalledWith(
			expect.stringContaining('Systems/Sleep.md'),
		);
		expect(source.quote).toBe('Check the condition again.');
	});
});
