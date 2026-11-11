import type { z } from 'zod';
import type { tableSchema } from './schema.js';

export type TableInput = z.infer<typeof tableSchema>;
export type TableReceipt = {
	path: string;
	format: 'markdown' | 'csv';
	rowCount: number;
	bytes: number;
	datasetHash: string;
	warnings: string[];
};
