import { storeKey } from '../../api/store/key.js';
import type { Todo } from './types.js';

export const todoKey = storeKey<'todo', Todo[]>('todo');
