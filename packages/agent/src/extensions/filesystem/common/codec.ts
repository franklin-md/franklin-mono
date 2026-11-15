import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';

const snapshot = z.object({ hash: z.string(), text: z.string().optional() });
const fileRecord = z.record(z.string(), snapshot);

export const fileRecordCodec = versioned()
	// Unversioned stores can mix original hash strings with snapshot objects.
	// See https://github.com/franklin-md/franklin-mono/pull/298.
	.version(0, zodCodec(z.record(z.string(), z.union([z.string(), snapshot]))))
	.version(1, zodCodec(fileRecord), (previous) =>
		Object.fromEntries(
			Object.entries(previous).map(([path, value]) => [
				path,
				typeof value === 'string' ? { hash: value } : value,
			]),
		),
	)
	.build();
