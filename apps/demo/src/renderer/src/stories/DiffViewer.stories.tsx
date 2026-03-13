import type { Meta, StoryObj } from '@storybook/react-vite';

import { DiffViewer } from '@/components/conversation/diff-viewer';

const meta = {
	title: 'Conversation/DiffViewer',
	component: DiffViewer,
	parameters: { layout: 'padded' },
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-2xl p-4">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof DiffViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewFile: Story = {
	args: {
		diff: {
			path: 'src/lib/middleware.ts',
			oldText: null,
			newText: 'import type { Agent } from "./agent";\n\nexport interface Middleware {\n  name: string;\n  wrap(agent: Agent): Agent;\n}\n\nexport function compose(...fns: Middleware[]): Middleware {\n  return fns.reduce((a, b) => ({\n    name: `${a.name}+${b.name}`,\n    wrap: (agent) => a.wrap(b.wrap(agent)),\n  }));\n}',
		},
	},
};

export const ModifiedFile: Story = {
	args: {
		diff: {
			path: 'src/lib/agent.ts',
			oldText: 'function createAgent(spec: AgentSpec) {\n  const proc = spawn(spec.command, spec.args);\n  return proc;\n}',
			newText: 'async function createAgent(spec: AgentSpec): Promise<Agent> {\n  const proc = spawn(spec.command, spec.args);\n  await waitForReady(proc);\n  return new Agent(proc);\n}',
		},
	},
};
