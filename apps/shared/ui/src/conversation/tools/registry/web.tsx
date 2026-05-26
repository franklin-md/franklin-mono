import { Eye, Globe } from 'lucide-react';

import {
	createWebExtension,
	DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID,
	EXA_WEB_SEARCH_PROVIDER_ID,
	type WebSearchOutput,
} from '@franklin/agent';
import {
	createToolRenderer,
	Icons,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { Favicon } from '../../../components/favicon.js';
import { displayUrl } from '../../../lib/display-url.js';
import {
	ToolSummary,
	ToolSummaryDetail,
	type ToolSummaryIcon,
} from '../summary.js';

const webExtension = createWebExtension({});
const searchProviderIcons: Record<string, ToolSummaryIcon> = {
	[DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID]: Icons.DuckDuckGo,
	[EXA_WEB_SEARCH_PROVIDER_ID]: Icons.Exa,
};

export const webToolRenderers = [
	createToolRenderer(webExtension.tools.fetchUrl, {
		summary: ({ args }) => {
			const { hostname, path } = displayUrl(args.url);

			return (
				<ToolSummary icon={Eye} label="Read">
					<Favicon hostname={hostname} />
					<span className="shrink-0 shimmerable">{hostname}</span>
					{path && <ToolSummaryDetail>{path}</ToolSummaryDetail>}
				</ToolSummary>
			);
		},
	}),
	createToolRenderer(webExtension.tools.searchWeb, {
		summary: ({ args, block }) => {
			const Icon =
				block.output == null ? Globe : getSearchProviderIcon(block.output);

			return (
				<ToolSummary icon={Icon} label="Search">
					<ToolSummaryDetail>{args.query}</ToolSummaryDetail>
				</ToolSummary>
			);
		},
	}),
] satisfies ToolRendererRegistryEntries;

function getSearchProviderIcon(output: WebSearchOutput): ToolSummaryIcon {
	if (output.kind !== 'success') {
		return Globe;
	}

	return searchProviderIcons[output.provider.id] ?? Globe;
}
