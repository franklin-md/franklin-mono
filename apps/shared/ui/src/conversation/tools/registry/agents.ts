import { Bot } from 'lucide-react';

import type { ToolRendererRegistryEntries } from '@franklin/react';

import { iconEntry } from '../entry.js';

export const agentToolRenderers = [
	['spawn', iconEntry(Bot, 'Spawn agent')],
] satisfies ToolRendererRegistryEntries;
