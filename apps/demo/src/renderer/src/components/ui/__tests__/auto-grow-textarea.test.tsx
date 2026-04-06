// @vitest-environment jsdom

import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AutoGrowTextarea } from '../auto-grow-textarea.js';

vi.mock('react-textarea-autosize', async () => {
	const React = await import('react');

	const MockTextareaAutosize = React.forwardRef<
		HTMLTextAreaElement,
		React.ComponentProps<'textarea'> & {
			minRows?: number;
			maxRows?: number;
		}
	>(({ minRows, maxRows, ...props }, ref) => (
		<textarea
			ref={ref}
			data-max-rows={maxRows}
			data-min-rows={minRows}
			{...props}
		/>
	));

	MockTextareaAutosize.displayName = 'MockTextareaAutosize';

	return {
		default: MockTextareaAutosize,
	};
});

describe('AutoGrowTextarea', () => {
	it('maps line props to react-textarea-autosize row props', () => {
		render(
			<AutoGrowTextarea minLines={3} maxLines={7} value="hello" readOnly />,
		);

		const textarea = screen.getByDisplayValue('hello');
		expect(textarea.getAttribute('data-min-rows')).toBe('3');
		expect(textarea.getAttribute('data-max-rows')).toBe('7');
	});

	it('forwards the textarea ref', () => {
		const ref = createRef<HTMLTextAreaElement>();

		render(<AutoGrowTextarea ref={ref} defaultValue="draft" />);

		expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
		expect(ref.current?.value).toBe('draft');
	});

	it('preserves base textarea styling while allowing overrides', () => {
		render(
			<AutoGrowTextarea
				className="px-6 text-base"
				defaultValue="styled text"
			/>,
		);

		const textarea = screen.getByDisplayValue('styled text');
		expect(textarea.className).toContain('resize-none');
		expect(textarea.className).toContain('rounded-md');
		expect(textarea.className).toContain('px-6');
		expect(textarea.className).toContain('text-base');
		expect(textarea.className).not.toContain('px-3');
		expect(textarea.className).not.toContain('text-sm');
	});
});
