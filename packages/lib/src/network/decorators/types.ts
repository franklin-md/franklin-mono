import type { Fetch } from '../types.js';

export type FetchDecorator = (next: Fetch) => Fetch;
