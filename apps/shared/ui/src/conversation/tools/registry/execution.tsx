import { Terminal } from 'lucide-react';

import { bashExtension } from '@franklin/extensions';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { toolEntry } from '../entry.js';
import { ToolSummaryDetail } from '../summary.js';

export const executionToolRenderers = [
	toolEntry(bashExtension.tools.bash, Terminal, undefined, (args) => (
		<ToolSummaryDetail>$ {args.cmd}</ToolSummaryDetail>
	)),
] satisfies ToolRendererRegistryEntries;
