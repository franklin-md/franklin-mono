import { storeKey } from '../../api/store/key.js';
import type { StatusState } from './types.js';

export const statusKey = storeKey<'status', StatusState>('status');
