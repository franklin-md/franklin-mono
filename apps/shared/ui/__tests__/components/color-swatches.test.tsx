// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ColorSwatches } from '../../src/components/color-swatches/index.js';

afterEach(cleanup);

const options = [
	{ id: 'blue', label: 'Blue', colorClassName: 'text-blue' },
	{ id: 'green', label: 'Green', colorClassName: 'text-green' },
];

it('selects a color from a labelled radio group', () => {
	const onChange = vi.fn();
	function Harness() {
		const [value, setValue] = useState('blue');
		return (
			<ColorSwatches
				options={options}
				value={value}
				label="Accent"
				onChange={(id) => {
					setValue(id);
					onChange(id);
				}}
			/>
		);
	}
	render(<Harness />);
	expect(screen.getByRole('radiogroup', { name: 'Accent' })).toBeTruthy();
	const green = screen.getByRole<HTMLInputElement>('radio', { name: 'Green' });
	expect(green.checked).toBe(false);
	fireEvent.click(green);
	expect(onChange).toHaveBeenCalledExactlyOnceWith('green');
	expect(green.checked).toBe(true);
});
