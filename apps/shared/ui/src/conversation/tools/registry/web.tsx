import { Globe } from 'lucide-react';

import { createWebExtension } from '@franklin/extensions';
import {
	createToolRenderer,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { Favicon } from '../../../components/favicon.js';
import { displayUrl } from '../../../lib/display-url.js';
import { toolEntry } from '../entry.js';
import { ToolSummaryDetail } from '../summary.js';

const webExtension = createWebExtension({});

export const webToolRenderers = [
	createToolRenderer(webExtension.tools.fetchUrl, {
		summary: ({ args }) => {
			const { hostname, path } = displayUrl(args.url);

			return (
				<>
					<Favicon hostname={hostname} />
					<span className="shrink-0">{hostname}</span>
					{path && <ToolSummaryDetail>{path}</ToolSummaryDetail>}
				</>
			);
		},
	}),
	toolEntry(webExtension.tools.searchWeb, Globe, 'Search', (args) => (
		<ToolSummaryDetail>{args.query}</ToolSummaryDetail>
	)),
] satisfies ToolRendererRegistryEntries;
