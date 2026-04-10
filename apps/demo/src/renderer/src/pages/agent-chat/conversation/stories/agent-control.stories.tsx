import type { Meta, StoryObj } from '@storybook/react-vite';
import { CornerDownLeft, Square } from 'lucide-react';

import type { PromptContextValue } from '@franklin/react';
import { PromptAgentControl, PromptProvider } from '@franklin/react';

function MockPromptProvider({
	children,
	...overrides
}: Partial<PromptContextValue> & { children: React.ReactNode }) {
	const value: PromptContextValue = {
		input: '',
		setInput: () => {},
		sending: false,
		canSend: true,
		send: () => {},
		cancel: () => {},
		...overrides,
	};
	return <PromptProvider value={value}>{children}</PromptProvider>;
}

const sendButton = (
	<button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-background/80 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-inset ring-ring/40 shadow-sm transition-colors hover:bg-background hover:text-foreground disabled:opacity-35">
		<CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
		Enter
	</button>
);

const cancelButton = (
	<button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive ring-1 ring-inset ring-destructive/40 shadow-sm transition-colors hover:bg-destructive/20">
		<Square className="h-3 w-3 fill-current" strokeWidth={2.4} />
		Stop
	</button>
);

const meta = {
	title: 'Conversation/AgentControl',
	component: PromptAgentControl,
} satisfies Meta<typeof PromptAgentControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	decorators: [
		(Story) => (
			<MockPromptProvider sending={false} canSend={true}>
				<Story />
			</MockPromptProvider>
		),
	],
	args: { send: sendButton, cancel: cancelButton },
};

export const Sending: Story = {
	decorators: [
		(Story) => (
			<MockPromptProvider sending={true}>
				<Story />
			</MockPromptProvider>
		),
	],
	args: { send: sendButton, cancel: cancelButton },
};

export const DisabledEmpty: Story = {
	name: 'Disabled (empty input)',
	decorators: [
		(Story) => (
			<MockPromptProvider sending={false} canSend={false}>
				<Story />
			</MockPromptProvider>
		),
	],
	args: { send: sendButton, cancel: cancelButton },
};
