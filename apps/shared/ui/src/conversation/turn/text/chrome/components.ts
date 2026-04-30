import type { Components } from 'streamdown';

import { bareComponents } from './bare-components.js';
import { Code } from './code.js';
import { Table } from './table.js';

export const chromeComponents = {
	...bareComponents,
	code: Code,
	table: Table,
} satisfies Components;
