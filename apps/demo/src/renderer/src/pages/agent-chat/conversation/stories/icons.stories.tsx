import type { Meta as StoryMeta, StoryObj } from '@storybook/react-vite';

import {
	Anthropic,
	ChatGLM,
	Claude,
	Codex,
	Cohere,
	DeepSeek,
	Gemini,
	Google,
	Groq,
	Kimi,
	Meta,
	MiniMax,
	Mistral,
	Moonshot,
	Ollama,
	OpenAI,
	OpenRouter,
	Perplexity,
	Qwen,
	Xiaomi,
	XiaomiMiMo,
	XAI,
	ZAI,
} from '@franklin/react';

const ICONS = [
	{ name: 'Anthropic', Icon: Anthropic },
	{ name: 'ChatGLM', Icon: ChatGLM },
	{ name: 'Claude', Icon: Claude },
	{ name: 'Codex', Icon: Codex },
	{ name: 'Cohere', Icon: Cohere },
	{ name: 'DeepSeek', Icon: DeepSeek },
	{ name: 'Gemini', Icon: Gemini },
	{ name: 'Google', Icon: Google },
	{ name: 'Groq', Icon: Groq },
	{ name: 'Kimi', Icon: Kimi },
	{ name: 'Meta', Icon: Meta },
	{ name: 'MiniMax', Icon: MiniMax },
	{ name: 'Mistral', Icon: Mistral },
	{ name: 'Moonshot', Icon: Moonshot },
	{ name: 'Ollama', Icon: Ollama },
	{ name: 'OpenAI', Icon: OpenAI },
	{ name: 'OpenRouter', Icon: OpenRouter },
	{ name: 'Perplexity', Icon: Perplexity },
	{ name: 'Qwen', Icon: Qwen },
	{ name: 'Xiaomi', Icon: Xiaomi },
	{ name: 'Xiaomi MiMo', Icon: XiaomiMiMo },
	{ name: 'xAI', Icon: XAI },
	{ name: 'Z.ai', Icon: ZAI },
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
