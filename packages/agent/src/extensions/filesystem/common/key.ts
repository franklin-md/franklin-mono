import { storeKey } from '../../../modules/store/api/key.js';

type FileSnapshot = { hash: string; text: string };

export type FileRecord = Record<string, string | FileSnapshot>;

export const fileKey = storeKey<'last_read', FileRecord>('last_read');
