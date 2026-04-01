import type { Components } from 'streamdown';

import { Code } from './code.js';
import { Table } from './table.js';

export const chromeComponents = {
	code: Code,
	table: Table,
} satisfies Components;
