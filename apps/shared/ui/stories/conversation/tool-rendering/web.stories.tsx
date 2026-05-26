import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	createWebExtension,
	EXA_WEB_SEARCH_PROVIDER_ID,
} from '@franklin/agent';

import { ToolRenderingMatrix } from './harness.js';

const webExtension = createWebExtension({});

const meta = {
	title: 'Conversation/Tool Rendering/Web',
	component: ToolRenderingMatrix,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof ToolRenderingMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FetchUrl: Story = {
	args: {
		title: 'fetch_url',
		toolName: webExtension.tools.fetchUrl.name,
		args: { url: 'https://github.com' },
		successArgs: { url: 'https://github.com/features/copilot' },
		successResultText: 'Fetched 12 KB of text.',
		errorResultText: 'Request timed out.',
	},
};

export const SearchWeb: Story = {
	args: {
		title: 'search_web',
		toolName: webExtension.tools.searchWeb.name,
		args: { query: 'Franklin agent runtime' },
		successOutput: {
			kind: 'success',
			provider: { id: EXA_WEB_SEARCH_PROVIDER_ID, name: 'Exa' },
			query: 'Franklin agent runtime',
			results: [
				{
					title: 'Franklin docs',
					url: 'https://example.com/franklin',
					snippet: 'Extension runtime documentation.',
				},
			],
		},
		errorOutput: {
			kind: 'error',
			query: 'Franklin agent runtime',
			message: 'No web search providers configured',
			failures: [],
		},
		successResultText: 'Returned 1 result.',
		errorResultText: 'Search failed.',
	},
};
