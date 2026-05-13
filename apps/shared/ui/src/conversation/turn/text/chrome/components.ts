import type { Components } from 'streamdown';

import { bareComponents } from './bare-components.js';
import { Code } from './code.js';
import { MarkdownLink } from './link.js';
import { Table } from './table.js';

export const chromeComponents = {
	...bareComponents,
	a: MarkdownLink,
	code: Code,
	table: Table,
} satisfies Components;
