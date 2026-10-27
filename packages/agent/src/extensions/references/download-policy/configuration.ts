import { createConfiguration } from '@franklin/extensibility/module';
import { documentDownloadPolicySchema } from './schema.js';
import type { DocumentDownloadPolicy } from './types.js';

export const documentDownloadPolicy = createConfiguration<
	Partial<DocumentDownloadPolicy>,
	DocumentDownloadPolicy
>({
	name: 'documentDownloadPolicy',
	// Contributions arrive in priority order. Merge low priority first so hosts
	// can override one duration while retaining the other setting/default.
	combine: (values) =>
		documentDownloadPolicySchema.parse(
			Object.assign({}, ...values.toReversed()),
		),
});
