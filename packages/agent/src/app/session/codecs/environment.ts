import { z } from 'zod';
import type { AbsolutePath } from '@franklin/lib';
import type { EnvironmentConfig } from '../../../modules/environment/api/index.js';

const AbsolutePathV1 = z.string().transform((value) => value as AbsolutePath);

const FilesystemPermissionsV1 = z.object({
	allowRead: z.array(z.string()),
	denyRead: z.array(z.string()),
	allowWrite: z.array(z.string()),
	denyWrite: z.array(z.string()),
});

export const EnvironmentSessionV1 = z.object({
	fsConfig: z.object({
		cwd: AbsolutePathV1,
		permissions: FilesystemPermissionsV1,
	}),
	netConfig: z.object({
		allowedDomains: z.array(z.string()),
		deniedDomains: z.array(z.string()),
	}),
}) satisfies z.ZodType<EnvironmentConfig>;
