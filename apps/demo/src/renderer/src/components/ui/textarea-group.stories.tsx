import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import type { TextareaGroupProps } from './textarea-group.js';
import { TextareaGroup } from './textarea-group.js';

type StoryTextareaGroupProps = Omit<
	TextareaGroupProps,
	'value' | 'onChange' | 'onSubmit' | 'buttonBar'
> & {
	initialValue?: string;
};

function StoryTextareaGroup({
	initialValue = '',
	maxLines = 10,
	minLines = 2,
	...props
}: StoryTextareaGroupProps) {
	const [value, setValue] = useState(initialValue);
	const lineCount = value.split('\n').length;

	return (
		<div className="w-full max-w-xl">
			<TextareaGroup
				value={value}
				onChange={setValue}
				onSubmit={() => undefined}
				minLines={minLines}
				maxLines={maxLines}
				buttonBar={
					<>
						<span className="px-1 text-xs text-muted-foreground">
							{lineCount} lines
						</span>
						<span className="px-1 text-xs text-muted-foreground">
							Native textarea scrollbar after max lines
						</span>
					</>
				}
				{...props}
			/>
		</div>
	);
}

const meta = {
	title: 'UI/TextareaGroup',
	component: StoryTextareaGroup,
	args: {
		placeholder: 'Type a message...',
	},
} satisfies Meta<typeof StoryTextareaGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const line = (index: number) =>
	`Line ${index}: The autosize wrapper should stay readable as the content grows.`;

const maxLineText = Array.from({ length: 10 }, (_, index) =>
	line(index + 1),
).join('\n');

const overflowText = Array.from({ length: 16 }, (_, index) =>
	line(index + 1),
).join('\n');

export const Empty: Story = {};

export const AtMaxLines: Story = {
	args: {
		initialValue: maxLineText,
	},
};

export const Overflowing: Story = {
	args: {
		initialValue: overflowText,
	},
};
