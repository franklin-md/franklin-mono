import { z } from 'zod';
import type { StoreMapping } from '../../../modules/store/api/index.js';

export const StoreSessionV1 = z.record(
	z.string(),
	z.string(),
) satisfies z.ZodType<StoreMapping>;
