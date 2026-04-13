import { createToolUseBlock } from '@franklin/react';
import { ToolCardChrome } from '@franklin/ui';

import { toolRegistry } from './registry.js';

export const ToolUse = createToolUseBlock(toolRegistry, ToolCardChrome);
