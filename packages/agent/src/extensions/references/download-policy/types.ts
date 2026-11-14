import type { z } from 'zod';
import type { documentDownloadPolicySchema } from './schema.js';

export type DocumentDownloadPolicy = z.infer<
	typeof documentDownloadPolicySchema
>;
