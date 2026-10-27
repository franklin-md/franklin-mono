import type { Meta, StoryObj } from '@storybook/react-vite';

import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxPrototype } from './prototype.js';
import { QuestionFeed } from '../ui/feed.js';
import type { StudyQuestion } from '../types.js';

const meta = {
	title: 'Obsidian/Inbox',
	component: InboxPrototype,
	parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof InboxPrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Workspace: Story = { args: { workspace: true } };
export const Sidebar: Story = { args: { width: 380 } };
export const WideFeed: Story = { args: { width: 740 } };
export const Empty: Story = { args: { width: 480, empty: true } };

const longQuestions: StudyQuestion[] = [
	{
		id: 'modes',
		text: '- [ ] Machine mode?\n\t- [ ] Supervisor/Hypervisor?',
		createdAt: Date.now(),
		model: 'Preview',
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
		state: {
			kind: 'answered',
			title: 'What are machine, supervisor and hypervisor modes?',
			answer:
				'These are processor privilege modes. The exact names and relationships depend on the architecture.',
		},
	},
	{
		id: 'long',
		text: '- [ ] How do you move data from user space to kernel space?\n\t- [ ] For example how are the args of system calls passed to the kernel?\n\t- [ ] Why are pointers and arrays complicated by virtual addresses and paging?',
		createdAt: Date.now() - 1000,
		model: 'Preview',
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
		state: {
			kind: 'answered',
			answer:
				'Scalar arguments arrive in registers; the kernel copies pointed-to data through the process page table.',
		},
	},
	{
		id: 'identifier',
		text: 'What does this_very_long_identifier_without_spaces_that_should_wrap_inside_a_narrow_sidebar_mean?',
		createdAt: Date.now() - 2000,
		model: 'Preview',
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
		state: { kind: 'queued' },
	},
];
const noAction = () => {};

export const LongHeaders: Story = {
	render: () => (
		<div className="study-preview study-standalone" style={{ width: 280 }}>
			<main className="study-inbox">
				<QuestionFeed
					questions={longQuestions}
					onFollowUp={noAction}
					onDelete={noAction}
					onRetry={noAction}
				/>
			</main>
		</div>
	),
};
