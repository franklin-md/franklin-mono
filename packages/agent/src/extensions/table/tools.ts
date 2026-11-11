import { toolSpec } from '../../modules/core/api/tool-spec.js';
import { tableSchema } from './schema.js';
import type { TableInput, TableReceipt } from './types.js';

export const writeTableSpec = toolSpec<'write_table', TableInput, TableReceipt>(
	'write_table',
	'Create a new research table file with verified Markdown or CSV serialization. Default to a Markdown note. Provide ordered typed columns, matching scalar/null cells and per-row source URLs. Existing files are refused; inspect and edit those with normal file tools. For a companion CSV reuse the exact dataset and pass expectedDatasetHash from the Markdown receipt. Two files are separate writes: report partial success. Blank/null means unknown. Link the completed Markdown note.',
	tableSchema,
);
