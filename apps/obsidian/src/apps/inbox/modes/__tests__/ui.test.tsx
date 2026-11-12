// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ModeControl } from '../../ui/mode.js';
import { InboxContent } from '../../ui/content.js';
import type { InboxPreferences } from '../../controller/types.js';
import type { ThoughtDump } from '../types.js';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
describe('composer modes', () => {
	it('keeps the draft across mode changes and submits through the selected path', async () => {
		vi.stubGlobal('matchMedia', () => ({ matches: true }));
		const add = vi.fn();
		const split = vi.fn();
		function Harness() {
			const [mode, setMode] = useState<InboxPreferences['mode']>('question');
			return (
				<InboxContent
					questions={[]}
					composerControls={<ModeControl mode={mode} onChange={setMode} />}
					mode={mode}
					onThoughtDump={split}
					onAdd={add}
					concurrency={1}
					setConcurrency={vi.fn()}
					onFollowUp={vi.fn()}
					onDelete={vi.fn()}
					onRetry={vi.fn()}
				/>
			);
		}
		render(<Harness />);
		const input = screen.getByRole<HTMLTextAreaElement>('textbox');
		fireEvent.change(input, { target: { value: 'Why pages? How big?' } });
		const toggle = screen.getByRole('button', { name: 'Thought dump mode' });
		expect(toggle.getAttribute('aria-pressed')).toBe('false');
		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-pressed')).toBe('true');
		expect(input.value).toBe('Why pages? How big?');
		expect(input.placeholder).toContain('Dump your thoughts');
		await act(async () => {
			fireEvent.keyDown(input, { key: 'Enter' });
		});
		expect(split).toHaveBeenCalledExactlyOnceWith('Why pages? How big?');
		expect(add).not.toHaveBeenCalled();
		expect(toggle.getAttribute('aria-pressed')).toBe('true');
		fireEvent.click(toggle);
		fireEvent.change(input, { target: { value: 'One question' } });
		await act(async () => {
			fireEvent.keyDown(input, { key: 'Enter' });
		});
		expect(add).toHaveBeenCalledExactlyOnceWith('One question');
	});
	it('keeps extraction progress and retry in the feed and hides completed notices', () => {
		vi.stubGlobal('matchMedia', () => ({ matches: true }));
		const retry = vi.fn();
		const dismiss = vi.fn();
		const dump: ThoughtDump = {
			id: 'd',
			text: 'My original thoughts',
			createdAt: 1,
			model: 'test',
			provider: 'test',
			reasoning: 'low',
			answerInstructions: '',
			state: { kind: 'running' },
		};
		const props = {
			questions: [],
			composerControls: null,
			concurrency: 1,
			setConcurrency: vi.fn(),
			onAdd: vi.fn(),
			onFollowUp: vi.fn(),
			onDelete: vi.fn(),
			onRetry: vi.fn(),
			onRetryExtraction: retry,
			onDismissExtraction: dismiss,
		};
		const { container, rerender } = render(
			<InboxContent {...props} thoughtDumps={[dump]} />,
		);
		expect(screen.getByRole('status').closest('.study-feed')).toBeTruthy();
		expect(screen.queryByText('No questions yet')).toBeNull();
		expect(container.querySelector('.study-header [role="status"]')).toBeNull();
		rerender(
			<InboxContent
				{...props}
				thoughtDumps={[
					{ ...dump, state: { kind: 'failed', error: 'No questions found' } },
				]}
			/>,
		);
		expect(screen.getByRole('alert').closest('.study-feed')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Retry extraction' }));
		expect(retry).toHaveBeenCalledWith('d');
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
		expect(dismiss).toHaveBeenCalledWith('d');
		rerender(
			<InboxContent
				{...props}
				thoughtDumps={[{ ...dump, state: { kind: 'succeeded', count: 2 } }]}
			/>,
		);
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.queryByText('My original thoughts')).toBeNull();
		expect(screen.queryByText('Added 2 questions')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
	});
});
