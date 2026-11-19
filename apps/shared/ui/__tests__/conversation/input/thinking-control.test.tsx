import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThinkingControl } from '../../../src/conversation/input/thinking/control.js';

afterEach(cleanup);

describe('controlled thinking level', () => {
	it('renders max reasoning and cycles back to the first supplied level', () => {
		const onChange = vi.fn();
		render(
			<ThinkingControl
				level="max"
				levels={['off', 'xhigh', 'max']}
				onChange={onChange}
			/>,
		);
		expect(screen.getByRole('button').textContent).toContain('Max');
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenCalledWith('off');
	});

	it('cycles through the levels supplied by the caller and only updates its owner', () => {
		const onChange = vi.fn();
		const levels = ['off', 'low', 'medium', 'high', 'xhigh'] as const;
		const { rerender } = render(
			<ThinkingControl level="off" levels={levels} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Thinking: off' }));
		expect(onChange).toHaveBeenLastCalledWith('low');
		rerender(
			<ThinkingControl level="low" levels={levels} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Thinking: low' }));
		expect(onChange).toHaveBeenLastCalledWith('medium');
		rerender(
			<ThinkingControl level="xhigh" levels={levels} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith('off');
	});
});
