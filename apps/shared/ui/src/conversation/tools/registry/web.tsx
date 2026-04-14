import { Globe } from 'lucide-react';

import { createWebFetchExtension } from '@franklin/extensions';
import {
	createToolRenderer,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { Favicon } from '../../../components/favicon.js';
import { displayUrl } from '../../../lib/display-url.js';
import { ToolSummary, ToolSummaryDetail } from '../summary.js';

const webFetchExtension = createWebFetchExtension({});

export const webToolRenderers = [
	createToolRenderer(webFetchExtension.tools.fetchUrl, {
		summary: ({ args }) => {
			const { hostname, path } = displayUrl(args.url);

			return (
				<ToolSummary
					icon={Globe}
					leading={<Favicon hostname={hostname} />}
					label={hostname}
				>
					{path && <ToolSummaryDetail>{path}</ToolSummaryDetail>}
				</ToolSummary>
			);
		},
	}),
] satisfies ToolRendererRegistryEntries;
