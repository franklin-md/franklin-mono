import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type {
	AgentStopCode,
	TurnEndBlock as TurnEndBlockType,
} from '@franklin/agent';
import { StopCode } from '@franklin/mini-acp';
import { AuthActionProvider, TurnEndBlock } from '@franklin/react';
import { defaultTurnEndRegistry, PortalContainerProvider } from '@franklin/ui';
import { QuestionCard } from '../../apps/inbox/ui/card/index.js';
import { QuestionActions } from '../../apps/inbox/ui/actions.js';
import { ExtractionProgress } from '../../apps/inbox/ui/extraction.js';
import { InboxQuestionPill } from '../../apps/inbox/directive/pill.js';
import { QuickEditPill } from '../../apps/quick-edit/interaction/pill.js';
import type { InboxController } from '../../apps/inbox/controller/index.js';
import type { InboxActionRun } from '../../apps/inbox/actions/types.js';
import type { FailedState } from '../../apps/inbox/types.js';
import type { InboxQuestion } from '../../apps/inbox/controller/types.js';
import type { ThoughtDump } from '../../apps/inbox/modes/types.js';

const OAUTH_REUSED =
	'OpenAI Codex token request failed (401): Your refresh token has already been used to generate a new access token. Please try signing in again.';
const NO_KEY =
	'Sign in or add a key for openai-codex in Franklin settings, then retry.';

const failures: { label: string; stopCode: AgentStopCode; message?: string }[] =
	[
		{
			label: 'Refresh token reused',
			stopCode: StopCode.AuthKeyInvalid,
			message: OAUTH_REUSED,
		},
		{
			label: 'No key',
			stopCode: StopCode.AuthKeyNotSpecified,
			message: NO_KEY,
		},
		{
			label: 'Provider error',
			stopCode: StopCode.ProviderError,
			message: 'Anthropic API returned 529: overloaded.',
		},
		{ label: 'Max tokens', stopCode: StopCode.MaxTokens },
		{ label: 'Cancelled', stopCode: StopCode.Cancelled },
	];

const failed: FailedState = {
	kind: 'failed',
	error: OAUTH_REUSED,
	stopCode: StopCode.AuthKeyInvalid,
};

const question: InboxQuestion = {
	id: 'q',
	rootId: 'q',
	attemptId: 'a',
	text: 'Where are my notes on coding in age of AI (and future of jobs)',
	createdAt: 1,
	updatedAt: 1,
	provider: 'openai-codex',
	model: 'gpt-5.5',
	reasoning: 'low',
	answerInstructions: '',
	state: failed,
};

const answered: InboxQuestion = {
	...question,
	id: 'answered',
	rootId: 'answered',
	state: { kind: 'answered', answer: 'They live in **Work/AI and jobs.md**.' },
};

const run: InboxActionRun = {
	id: 'run',
	attemptId: 'a',
	action: {
		id: 'flashcards',
		name: 'Make flashcards',
		prompt: 'Make cards.',
		icon: 'lucide-layers',
		color: 'purple',
	},
	question: answered,
	ancestors: [],
	createdAt: 1,
	provider: 'openai-codex',
	model: 'gpt-5.5',
	reasoning: 'low',
	state: failed,
};

const dump: ThoughtDump = {
	id: 'dump',
	text: 'How does the scheduler pick the next task? Why does it starve long jobs?',
	createdAt: 1,
	provider: 'openai-codex',
	model: 'gpt-5.5',
	reasoning: 'low',
	answerInstructions: '',
	state: failed,
};

const inbox = {
	state: {
		subscribe: () => () => {},
		get: () => ({ questions: [question] }),
	},
	remove: async () => {},
} as unknown as InboxController;

const noop = () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				{title}
			</h2>
			{children}
		</section>
	);
}

function chatBlock(
	stopCode: AgentStopCode,
	message?: string,
): TurnEndBlockType {
	return {
		kind: 'turnEnd',
		stopCode,
		...(message ? { stopMessage: message } : {}),
		startedAt: 0,
		endedAt: 0,
	};
}

function Gallery() {
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	return (
		<AuthActionProvider handlers={{ requestApiKey: noop }}>
			<div className="franklin" ref={setContainer}>
				<PortalContainerProvider value={container ?? undefined}>
					<div className="box-border flex w-[420px] flex-col gap-8 bg-background p-6 font-sans text-sm text-foreground">
						<Section title="Chat turn end">
							{failures.map(({ label, stopCode, message }) => (
								<div key={label} className="flex flex-col gap-1.5">
									<p className="m-0 text-[11px] text-muted-foreground">
										{label}
									</p>
									<p className="m-0">Here is what I found so far…</p>
									<TurnEndBlock
										block={chatBlock(stopCode, message)}
										registry={defaultTurnEndRegistry}
									/>
								</div>
							))}
						</Section>
						<Section title="Inbox question">
							<QuestionCard
								question={question}
								childCount={0}
								focused={false}
								onFocus={noop}
								onFollowUp={noop}
								onDelete={noop}
								onRetry={noop}
							/>
							<QuestionCard
								question={{
									...question,
									id: 'running',
									text: 'Why does the scheduler starve long jobs?',
									state: { kind: 'running' },
								}}
								childCount={0}
								focused={false}
								onFocus={noop}
								onFollowUp={noop}
								onDelete={noop}
								onRetry={noop}
							/>
						</Section>
						<Section title="Inbox action">
							<QuestionActions
								actions={[run.action]}
								runs={[run]}
								onRun={noop}
								onRetry={noop}
								onDismiss={noop}
							/>
						</Section>
						<Section title="Thought dump">
							<ExtractionProgress dump={dump} onRetry={noop} onDismiss={noop} />
						</Section>
						<Section title="Directive pills">
							<p className="m-0 leading-loose">
								Ask about scheduling
								<InboxQuestionPill
									state={{ questionId: 'q' }}
									inbox={inbox}
									onOpen={noop}
									onError={noop}
								/>
								and rewrite this
								<QuickEditPill
									state={{
										path: 'note.md',
										line: 1,
										selection: '',
										prompt: 'Tighten this paragraph',
										status: 'failed',
										error: OAUTH_REUSED,
										stopCode: StopCode.AuthKeyInvalid,
									}}
									stop={noop}
								/>
							</p>
						</Section>
					</div>
				</PortalContainerProvider>
			</div>
		</AuthActionProvider>
	);
}

const meta = {
	title: 'Failures/Gallery',
	component: Gallery,
	parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSurfaces: Story = {};
