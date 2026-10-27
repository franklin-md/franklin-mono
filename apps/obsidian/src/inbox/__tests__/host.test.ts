import { describe, expect, it, vi } from 'vitest';
import type { App, Command, Editor, MarkdownFileInfo, Plugin } from 'obsidian';
import type { FranklinApp } from '@franklin/agent';
import type { InboxController } from '../controller/controller.js';
import { captureSelection } from '../host/capture.js';
import { captureCurrentNote } from '../host/current-note.js';
import { captureOutline } from '../host/outline.js';
import { selectionQuestion } from '../selection-question.js';
import { openQuestionSource } from '../host/open-source.js';
import { registerInbox } from '../host/register.js';

const content =
	'# Sleep\n## Locking\nCheck the condition again.\nMore context.';
function editor() {
	return {
		getSelection: () => 'Check the condition again.',
		getCursor: (side: string) =>
			side === 'from' ? { line: 2, ch: 0 } : { line: 2, ch: 26 },
		getValue: () => content,
		posToOffset: () => 18,
		offsetToPos: (offset: number) => ({ line: 2, ch: offset - 18 }),
		setSelection: vi.fn(),
		scrollIntoView: vi.fn(),
		focus: vi.fn(),
	} as unknown as Editor;
}
const view = {
	file: { basename: 'Sleep', path: 'Systems/Sleep.md' },
} as MarkdownFileInfo;

describe('Obsidian inbox commands and source navigation', () => {
	it('captures the exact selection, file, heading and context', () => {
		const captured = captureSelection({ editor: editor(), view });
		expect(captured).toMatchObject({
			note: 'Sleep',
			heading: 'Locking',
			quote: 'Check the condition again.',
			location: {
				path: 'Systems/Sleep.md',
				context: content,
				from: { line: 2, ch: 0 },
			},
		});
		expect(captured?.location?.id).toBeTruthy();
	});
	it('adds selected text through an editor command without changing the source note', async () => {
		const commands: Command[] = [];
		const add = vi.fn(async () => 'q');
		const plugin = {
			addCommand: (command: Command) => commands.push(command),
			registerView: vi.fn(),
			addRibbonIcon: vi.fn(),
		} as unknown as Plugin;
		registerInbox({
			plugin,
			app: {} as FranklinApp,
			inbox: { add } as unknown as InboxController,
			hostActionBindings: [],
		});
		const capture = commands.find(
			(command) => command.id === 'selection-to-study-inbox',
		)!;
		expect(capture.editorCheckCallback?.(true, editor(), view)).toBe(true);
		expect(add).not.toHaveBeenCalled();
		capture.editorCheckCallback?.(false, editor(), view);
		await vi.waitFor(() =>
			expect(add).toHaveBeenCalledWith(
				'Check the condition again.',
				undefined,
				expect.objectContaining({ quote: 'Check the condition again.' }),
			),
		);
		const empty = editor();
		vi.spyOn(empty, 'getSelection').mockReturnValue('');
		expect(capture.editorCheckCallback?.(true, empty, view)).toBe(false);
	});
	it('selects an unchanged quote, and re-finds it after edits instead of silently selecting unrelated text', async () => {
		const e = editor();
		const file = { path: 'Systems/Sleep.md' };
		const leaf = {
			openFile: vi.fn(),
			view: { getViewType: () => 'markdown', editor: e },
		};
		const app = {
			vault: { getFileByPath: () => file },
			workspace: { getLeaf: () => leaf },
		} as unknown as App;
		const source = captureSelection({ editor: e, view })!;
		await openQuestionSource(app, source);
		expect(e.setSelection).toHaveBeenCalled();
		expect(e.focus).toHaveBeenCalled();
		const edited = 'New intro\n' + content;
		vi.spyOn(e, 'getValue').mockReturnValue(edited);
		vi.mocked(e.setSelection).mockClear();
		await openQuestionSource(app, source);
		expect(e.setSelection).toHaveBeenCalledWith(
			e.offsetToPos(edited.indexOf(source.quote)),
			e.offsetToPos(edited.indexOf(source.quote) + source.quote.length),
		);
	});
});

describe('nested study questions', () => {
	it('captures the xv6 task under its actual parent items, even outside the nearby text window', () => {
		const text = [
			'# xv6 SP',
			'## Lecture 3',
			'- [[System Call]] Mechanism',
			'\t- `ecall <n>`',
			'\t- Same entry point',
			`\t  ${'Surrounding explanation. '.repeat(80)}`,
			'\t\t- [ ] What defines this entry point?',
		].join('\n');
		const quote = '- [ ] What defines this entry point?';
		const start = text.indexOf(quote);
		const e = editor();
		vi.spyOn(e, 'getValue').mockReturnValue(text);
		vi.spyOn(e, 'getSelection').mockReturnValue(quote);
		vi.spyOn(e, 'getCursor').mockImplementation((side) => ({
			line: 6,
			ch: side === 'to' ? quote.length + 2 : 2,
		}));
		vi.spyOn(e, 'posToOffset').mockImplementation((position) =>
			position.ch === 2 ? start : start + quote.length,
		);
		const source = captureSelection({ editor: e, view })!;
		expect(source.outline).toEqual([
			'xv6 SP',
			'Lecture 3',
			'[[System Call]] Mechanism',
			'Same entry point',
		]);
		expect(source.location?.context).not.toContain('Same entry point');
		expect(source.quote).toBe(quote);
		expect(selectionQuestion(source.quote)).toBe(
			'What defines this entry point?',
		);
	});
	it('drops previous sibling branches and ignores headings or list items in code fences', () => {
		const text =
			'# Notes\n## Old\n- Old parent\n  - Old child\n## Current\n```md\n# Fake heading\n- Fake parent\n```\n- Actual parent\n  - Previous child\n  - [ ] Selected question';
		expect(captureOutline(text, 11)).toEqual([
			'Notes',
			'Current',
			'Actual parent',
		]);
		expect(selectionQuestion('- [x] What happens?')).toBe('What happens?');
		expect(selectionQuestion('1. [ ] Why?')).toBe('Why?');
		expect(selectionQuestion('- [ ] First\n- [ ] Second')).toBe(
			'- [ ] First\n- [ ] Second',
		);
	});
});

describe('composer note context', () => {
	it('attaches the last active note while the inbox is focused and locates a pasted task', async () => {
		const content =
			'# xv6 SP\n- [[System Call]] Mechanism\n\t- Same entry point\n\t\t- [ ] What defines this entry point?';
		const app = {
			workspace: {
				getActiveFile: () => ({
					basename: 'xv6 SP',
					path: 'Study/xv6 SP.md',
					extension: 'md',
				}),
				getMostRecentLeaf: () => ({
					view: { getViewType: () => 'franklin-study-inbox' },
				}),
				getLeavesOfType: () => [],
			},
			vault: { cachedRead: vi.fn(async () => content) },
		} as unknown as App;
		const captured = await captureCurrentNote(
			app,
			'What defines this entry point?',
		);
		expect(captured).toMatchObject({
			quote: 'What defines this entry point?',
			outline: ['xv6 SP', '[[System Call]] Mechanism', 'Same entry point'],
			location: {
				path: 'Study/xv6 SP.md',
				context: content,
				from: { line: 3, ch: 8 },
			},
		});
	});
	it('uses the open editor buffer and falls back to its selection for a new question', async () => {
		const e = editor();
		const app = {
			workspace: {
				getActiveFile: () => ({
					basename: 'Sleep',
					path: 'Systems/Sleep.md',
					extension: 'md',
				}),
				getMostRecentLeaf: () => ({
					view: { ...view, editor: e, getViewType: () => 'markdown' },
				}),
			},
			vault: { cachedRead: vi.fn() },
		} as unknown as App;
		const captured = await captureCurrentNote(
			app,
			'What about spurious wakeups?',
		);
		expect(captured?.quote).toBe('Check the condition again.');
		expect(captured?.location?.context).toBe(content);
		expect(app.vault.cachedRead).not.toHaveBeenCalled();
	});
	it('keeps standalone questions available when no Markdown note is active', async () => {
		const app = { workspace: { getActiveFile: () => null } } as unknown as App;
		expect(
			await captureCurrentNote(app, 'Standalone question'),
		).toBeUndefined();
	});
});
