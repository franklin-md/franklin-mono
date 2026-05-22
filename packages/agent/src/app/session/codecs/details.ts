import { z } from 'zod';
import type { DetailsSnapshot } from '../../../modules/orchestrator/internal/details/index.js';

export const DetailsSessionV2 = z.object({
	visibility: z.enum(['visible', 'hidden']),
}) satisfies z.ZodType<DetailsSnapshot>;
