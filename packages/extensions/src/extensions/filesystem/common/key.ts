import { storeKey } from '../../../api/store/key.js';

export type FileRecord = Record<string, string>;

export const fileKey = storeKey<'last_read', FileRecord>('last_read');
