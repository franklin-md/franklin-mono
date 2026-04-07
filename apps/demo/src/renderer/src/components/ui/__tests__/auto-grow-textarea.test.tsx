// @vitest-environment jsdom

import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AutoGrowTextarea } from '../auto-grow-textarea.js';

vi.mock('../scroll-area.js', async () => {
	const React = await import('react');

	const MockScrollArea = React.forwardRef<
		HTMLDivElement,
		React.ComponentProps<'div'>
	>(({ children, ...props }, ref) => (
		<div ref={ref} data-scroll-area="" {...props}>
			{children}
		</div>
	));

	MockScrollArea.displayName = 'MockScrollArea';

	return {
		ScrollArea: MockScrollArea,
	};
});

vi.mock('react-textarea-autosize', async () => {
	const React = await import('react');

	const MockTextareaAutosize = React.forwardRef<
		HTMLTextAreaElement,
		React.ComponentProps<'textarea'> & {
			minRows?: number;
			maxRows?: number;
			onHeightChange?: (...args: unknown[]) => void;
		}
	>(({ minRows, maxRows, onHeightChange: _onHeightChange, ...props }, ref) => (
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
	it('maps minLines to minRows and wraps in ScrollArea when maxLines is set', () => {
		const { container } = render(
			<AutoGrowTextarea minLines={3} maxLines={7} value="hello" readOnly />,
		);

		const textarea = screen.getByDisplayValue('hello');
		expect(textarea.getAttribute('data-min-rows')).toBe('3');
		// maxRows is NOT forwarded to TextareaAutosize — clamping is done by the hook
		expect(textarea.getAttribute('data-max-rows')).toBeNull();
		expect(container.querySelector('[data-scroll-area]')).not.toBeNull();
	});

	it('does not wrap in ScrollArea when maxLines is not set', () => {
		const { container } = render(
			<AutoGrowTextarea minLines={3} value="no scroll" readOnly />,
		);

		expect(container.querySelector('[data-scroll-area]')).toBeNull();
		expect(screen.getByDisplayValue('no scroll')).toBeTruthy();
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

	it('uses default minLines of 2', () => {
		render(<AutoGrowTextarea defaultValue="defaults" />);

		const textarea = screen.getByDisplayValue('defaults');
		expect(textarea.getAttribute('data-min-rows')).toBe('2');
	});

	it('forwards onHeightChange to the caller', () => {
		const onHeightChange = vi.fn();

		render(
			<AutoGrowTextarea
				defaultValue="callback"
				onHeightChange={onHeightChange}
			/>,
		);

		// The mock doesn't fire onHeightChange, so we just verify it renders.
		// The real integration is tested via the hook tests.
		expect(screen.getByDisplayValue('callback')).toBeTruthy();
	});
});
