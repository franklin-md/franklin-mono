import type { RuntimeBase } from '../types.js';

export type Session<RT extends RuntimeBase<any>> = {
	id: string;
	runtime: RT;
};
