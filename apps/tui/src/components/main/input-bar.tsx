import React from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	disabled?: boolean;
}

export function InputBar({
	value,
	onChange,
	onSubmit,
	disabled,
}: Props): React.ReactNode {
	useInput(
		(input, key) => {
			if (disabled) return;

			if (key.return) {
				onSubmit();
			} else if (key.backspace || key.delete) {
				onChange(value.slice(0, -1));
			} else if (!key.ctrl && !key.meta && input) {
				onChange(value + input);
			}
		},
		{ isActive: !disabled },
	);

	if (disabled) {
		return (
			<Box>
				<Text dimColor>Session ended.</Text>
			</Box>
		);
	}

	return (
		<Box>
			<Text bold color="green">
				{'> '}
			</Text>
			<Text>{value}</Text>
			<Text dimColor>{'█'}</Text>
		</Box>
	);
}
