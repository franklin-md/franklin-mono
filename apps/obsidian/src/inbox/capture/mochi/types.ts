import type { z } from 'zod';
import type { mochiSnapshotSchema } from './schema.js';

export type MochiSnapshot = z.infer<typeof mochiSnapshotSchema>;
export type CapturedCard = MochiSnapshot['cards'][number];
