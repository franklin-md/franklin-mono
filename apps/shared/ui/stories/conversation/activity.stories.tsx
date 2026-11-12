import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
	AssistantBlock,
	ConversationTurn,
	ToolUseBlock,
} from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';

import { Button } from '../../src/primitives/button.js';
import { ConversationView } from '../../src/conversation/view.js';

const startedAt = Date.now() - 18_000;
const reasoning: AssistantBlock = {
	kind: 'thinking',
	text: 'I will check the notes and compare them with the source.',
	startedAt,
	endedAt: startedAt + 2000,
};

function read(id: string, path: string, complete: boolean): ToolUseBlock {
	return {
		kind: 'toolUse',
		call: { type: 'toolCall', id, name: 'read_file', arguments: { path } },
		startedAt: startedAt + 3000,
		...(complete && {
			endedAt: startedAt + 4000,
			result: { content: [{ type: 'text' as const, text: 'Read the note.' }] },
		}),
	};
}

const firstRead = read('ownership', 'Study/Rust/Ownership.md', true);
const secondRead = read('borrowing', 'Study/Rust/Borrowing.md', true);
const commentary: AssistantBlock = {
	kind: 'text',
	text: 'I found your notes. I’ll check the borrowing example next.',
	startedAt: startedAt + 5000,
	endedAt: startedAt + 6000,
};
const answer: AssistantBlock = {
	kind: 'text',
	text: 'A shared reference lets several parts of your program **read the same value**. A mutable reference gives one borrower exclusive access for its lifetime.\n\nThe key rule is: you can have any number of shared references, or one mutable reference, while they are in use.',
	startedAt: startedAt + 16_000,
	endedAt: startedAt + 18_000,
};
const end: AssistantBlock = {
	kind: 'turnEnd',
	stopCode: StopCode.Finished,
	startedAt: startedAt + 18_000,
	endedAt: startedAt + 18_000,
};

function turn(blocks: AssistantBlock[]): ConversationTurn[] {
	return [
		{
			id: 'activity-example',
			timestamp: startedAt,
			prompt: {
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'How do shared and mutable references differ?',
					},
				],
			},
			response: { blocks },
		},
	];
}

const running = turn([
	reasoning,
	firstRead,
	commentary,
	read('borrowing', 'Study/Rust/Borrowing.md', false),
]);
const complete = turn([
	reasoning,
	firstRead,
	commentary,
	secondRead,
	answer,
	end,
]);
const components = { Footer: () => null };

function ReplayActivity() {
	const [step, setStep] = useState(0);
	const frames = [
		turn([{ ...reasoning, endedAt: undefined }]),
		turn([reasoning, read('ownership', 'Study/Rust/Ownership.md', false)]),
		running,
		turn([reasoning, firstRead, commentary, secondRead, answer]),
		complete,
	];
	return (
		<div className="flex h-[540px] max-w-2xl flex-col">
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					onClick={() => setStep((value) => (value + 1) % frames.length)}
				>
					{step === frames.length - 1 ? 'Replay' : 'Next action'}
				</Button>
				<span className="text-xs text-muted-foreground">
					{
						[
							'Thinking',
							'Reading a note',
							'Reading another note',
							'Writing the answer',
							'Complete',
						][step]
					}
				</span>
			</div>
			<ConversationView
				key={step === 0 ? 'reset' : 'replay'}
				turns={frames[step] ?? running}
				components={components}
			/>
		</div>
	);
}

const meta = {
	title: 'Conversation/Activity',
	component: ConversationView,
	decorators: [
		(Story) => (
			<div className="flex h-[520px] max-w-2xl flex-col">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ConversationView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { turns: running, components } };
export const Completed: Story = { args: { turns: complete, components } };
export const Narrow: Story = {
	args: { turns: running, components },
	decorators: [
		(Story) => (
			<div className="flex h-[520px] w-[280px] flex-col">
				<Story />
			</div>
		),
	],
};
export const Failed: Story = {
	args: {
		turns: turn([
			reasoning,
			{
				...firstRead,
				result: {
					content: [{ type: 'text', text: 'Note not found' }],
					isError: true,
				},
			},
			{
				...end,
				kind: 'turnEnd',
				stopCode: StopCode.ProviderError,
				stopMessage: 'The connection was interrupted. Please try again.',
			},
		]),
		components,
	},
};
export const Replay: Story = {
	args: { turns: running },
	render: () => <ReplayActivity />,
};
