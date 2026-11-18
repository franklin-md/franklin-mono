import type { z } from 'zod';
import type { thoughtDumpSchema } from './schema.js';
import type { extractionSchema } from './extraction-schema.js';

export type Extraction = z.infer<typeof extractionSchema>;
export type ThoughtDump = z.infer<typeof thoughtDumpSchema>;
export type SplitRequest = { dump: ThoughtDump; signal: AbortSignal };
