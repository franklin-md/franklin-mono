import type { Meta as StoryMeta, StoryObj } from '@storybook/react-vite';

import { Icons } from '@franklin/react';

const ICONS = [
	{ name: 'Anthropic', Icon: Icons.Anthropic },
	{ name: 'ChatGLM', Icon: Icons.ChatGLM },
	{ name: 'Claude', Icon: Icons.Claude },
	{ name: 'Codex', Icon: Icons.Codex },
	{ name: 'Cohere', Icon: Icons.Cohere },
	{ name: 'DeepSeek', Icon: Icons.DeepSeek },
	{ name: 'Gemini', Icon: Icons.Gemini },
	{ name: 'Google', Icon: Icons.Google },
	{ name: 'Groq', Icon: Icons.Groq },
	{ name: 'Kimi', Icon: Icons.Kimi },
	{ name: 'Meta', Icon: Icons.Meta },
	{ name: 'MiniMax', Icon: Icons.MiniMax },
	{ name: 'Mistral', Icon: Icons.Mistral },
	{ name: 'Moonshot', Icon: Icons.Moonshot },
	{ name: 'Ollama', Icon: Icons.Ollama },
	{ name: 'OpenAI', Icon: Icons.OpenAI },
	{ name: 'OpenRouter', Icon: Icons.OpenRouter },
	{ name: 'Perplexity', Icon: Icons.Perplexity },
	{ name: 'Qwen', Icon: Icons.Qwen },
	{ name: 'Xiaomi', Icon: Icons.Xiaomi },
	{ name: 'Xiaomi MiMo', Icon: Icons.XiaomiMiMo },
	{ name: 'xAI', Icon: Icons.XAI },
	{ name: 'Z.ai', Icon: Icons.ZAI },
] as const;

function IconGallery({ size }: { size: number }) {
	return (
		<div className="grid grid-cols-5 gap-6 p-6">
			{ICONS.map(({ name, Icon }) => (
				<div
					key={name}
					className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 ring-1 ring-gray-200"
				>
					<Icon size={size} />
					<span className="text-xs text-gray-500">{name}</span>
				</div>
			))}
		</div>
	);
}

const meta = {
	title: 'Icons',
	component: IconGallery,
	args: { size: 32 },
	argTypes: {
		size: { control: { type: 'range', min: 12, max: 96, step: 4 } },
	},
} satisfies StoryMeta<typeof IconGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
	args: { size: 16 },
};

export const Large: Story = {
	args: { size: 64 },
};
