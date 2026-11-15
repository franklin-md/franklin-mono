import { storeKey } from '../../../modules/store/api/key.js';
import type { FileRecord } from './types.js';

export const fileKey = storeKey<'last_read', FileRecord>('last_read');
