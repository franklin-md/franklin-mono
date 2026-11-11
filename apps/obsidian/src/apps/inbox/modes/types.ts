import type { z } from 'zod';
import type { thoughtDumpSchema } from './schema.js';

export type ThoughtDump = z.infer<typeof thoughtDumpSchema>;
export type SplitRequest = { dump: ThoughtDump; signal: AbortSignal };
