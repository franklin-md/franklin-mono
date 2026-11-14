import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptSurface } from '../../../src/conversation/input/prompt-surface.js';
import { PromptSubmitButton } from '../../../src/conversation/input/prompt-submit-button.js';

afterEach(cleanup);

describe('host-owned prompt submission', () => {
	it('styles a form without adding a wrapper and delegates explicit submission', () => {
		const submit = vi.fn();
		const { container } = render(
			<PromptSurface asChild>
				<form onSubmit={(event) => { event.preventDefault(); submit(); }}>
					<textarea aria-label="Prompt" />
					<PromptSubmitButton type="submit" />
				</form>
			</PromptSurface>,
		);
		expect(container.firstElementChild?.tagName).toBe('FORM');
		fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
		expect(submit).toHaveBeenCalledOnce();
	});

	it('keeps compact submission labelled, optional and disabled by its owner', () => {
		const submit = vi.fn();
		const click = vi.fn();
		const { rerender } = render(
			<form onSubmit={submit}>
				<PromptSubmitButton compact onClick={click} />
			</form>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Submit prompt' }));
		expect(click).toHaveBeenCalledOnce();
		expect(submit).not.toHaveBeenCalled();
		rerender(<PromptSubmitButton compact disabled onClick={click} />);
		fireEvent.click(screen.getByRole('button', { name: 'Submit prompt' }));
		expect(click).toHaveBeenCalledOnce();
	});
});
