import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThinkingControl } from '../../../src/conversation/input/thinking/control.js';

afterEach(cleanup);

describe('controlled thinking level', () => {
	it('includes Minimal when supplied by the caller and only updates its owner', () => {
		const onChange = vi.fn();
		const levels = [
			'off',
			'minimal',
			'low',
			'medium',
			'high',
			'xhigh',
		] as const;
		const { rerender } = render(
			<ThinkingControl level="off" levels={levels} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Thinking: off' }));
		expect(onChange).toHaveBeenLastCalledWith('minimal');
		rerender(
			<ThinkingControl level="minimal" levels={levels} onChange={onChange} />,
		);
		expect(screen.getByRole('button').textContent).toContain('Min');
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith('low');
		rerender(
			<ThinkingControl level="xhigh" levels={levels} onChange={onChange} />,
		);
		fireEvent.click(screen.getByRole('button'));
		expect(onChange).toHaveBeenLastCalledWith('off');
	});
});
