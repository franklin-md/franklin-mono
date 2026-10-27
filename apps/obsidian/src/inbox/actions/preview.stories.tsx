import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import { InboxController } from '../controller/controller.js';
import { inboxCodec } from '../controller/schema.js';
import { InboxPanel } from '../ui/panel.js';
import { InboxActionSettings } from '../../settings/inbox-actions/settings.js';
import type { InboxDocument } from '../controller/types.js';
import '../ui/styles.css';
import '../ui/live.css';
import '../ui/motion.css';

const flashcardPrompt = `Read [[Flashcard Design Prompt]], [[Mochi Workflow]], and Agents/prompts/Flashcard Proposals.md. Apply their card-design, source-context, duplicate-checking and review guidance to this question and answer only. Adapt the batch instructions to this single question; edit the files directly.

Append suitable proposals, unchecked, to Ledger/Flashcard Inbox.md. Preserve existing entries and allocate IDs using the inbox's next_id. Include source links. Verify the saved output, then report the number of proposals and link to the inbox. If retrying, inspect existing proposals first to avoid duplicating partial work. Leave export to Mochi for my review.`;

const document: InboxDocument = {
	preferences: {
		provider: 'preview',
		model: 'Preview',
		reasoning: 'off',
		answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
		concurrency: 3,
	},
	actions: [{ id: 'cards', name: '🃏', prompt: flashcardPrompt }],
	actionRuns: [],
	questions: [
		{
			id: 'question',
			rootId: 'question',
			attemptId: 'answer',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			text: 'Why check the condition again after waking up?',
			provider: 'preview',
			model: 'Preview',
			reasoning: 'off',
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			source: {
				note: 'Sleep and wakeup',
				heading: 'Avoiding lost wakeups',
				quote: 'The condition may have changed before the process runs.',
			},
			state: {
				kind: 'answered',
				answer:
					'A wakeup makes the process runnable. The scheduler may run it later, after another process has changed the condition, so it must check again while holding the lock.',
			},
		},
	],
};

type Props = { settings?: boolean; width?: number };

function ActionPreview({ settings = false, width = 380 }: Props) {
	const [inbox, setInbox] = useState<InboxController>();
	const [notice, setNotice] = useState('');
	useEffect(() => {
		let disposed = false;
		let controller: InboxController | undefined;
		const persistence = createSingleFilePersister(
			new MemoryFilesystem(),
			toAbsolutePath('/inbox.json'),
			inboxCodec,
		);
		void persistence
			.save(structuredClone(document))
			.then(() =>
				InboxController.create({
					defaults: document.preferences,
					persistence,
					run: async () => {},
					runAction: ({ signal }) =>
						new Promise<string>((resolve, reject) => {
							const timer = window.setTimeout(() => {
								signal.removeEventListener('abort', cancel);
								resolve('Added 2 flashcard proposals.');
							}, 2000);
							const cancel = () => {
								window.clearTimeout(timer);
								reject(new Error('Cancelled'));
							};
							signal.addEventListener('abort', cancel, { once: true });
						}),
					onActionComplete: (name, summary) => setNotice(`${name} ${summary}`),
				}),
			)
			.then((created) => {
				controller = created;
				if (disposed) void created.dispose();
				else setInbox(created);
			});
		return () => {
			disposed = true;
			void controller?.dispose();
		};
	}, []);
	if (!inbox) return <p>Loading preview…</p>;
	return (
		<div
			className="study-preview study-standalone"
			style={{
				width,
				height: '90vh',
				padding: settings ? 20 : 0,
				overflow: settings ? 'auto' : 'hidden',
			}}
		>
			{settings ? (
				<>
					<h2>Inbox actions</h2>
					<InboxActionSettings inbox={inbox} />
				</>
			) : (
				<InboxPanel
					controller={inbox}
					onOpenSource={() => setNotice('Preview source: Sleep and wakeup')}
					onSettings={() =>
						setNotice('Configure actions in Franklin settings → Inbox actions.')
					}
					onError={(error) => setNotice(String(error))}
				/>
			)}
			{notice && <p role="status">{notice}</p>}
		</div>
	);
}

const meta = {
	title: 'Obsidian/Inbox actions',
	component: ActionPreview,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ActionPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sidebar: Story = {};
export const Settings: Story = { args: { settings: true, width: 640 } };
