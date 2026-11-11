import type { z } from 'zod';
import type { mcpServerSchema } from './schema.js';

export type MCPServerConfig = z.infer<typeof mcpServerSchema>;
