import { createToolUseBlock } from '@franklin/react';

import { ToolCardChrome } from './chrome.js';
import { toolRegistry } from './registry.js';

export const ToolUse = createToolUseBlock(toolRegistry, ToolCardChrome);
