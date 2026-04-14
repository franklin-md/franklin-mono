import { Bot, Terminal } from 'lucide-react';

import { bashExtension } from '@franklin/extensions';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { iconEntry, toolEntry } from '../entry.js';
import { ToolSummaryDetail } from '../summary.js';

export const executionToolRenderers = [
	toolEntry(bashExtension.tools.bash, Terminal, undefined, (args) => (
		<ToolSummaryDetail>$ {args.cmd}</ToolSummaryDetail>
	)),
	['spawn', iconEntry(Bot, 'Spawn agent')],
] satisfies ToolRendererRegistryEntries;
