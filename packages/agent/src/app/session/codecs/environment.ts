import { z } from 'zod';
import { validateNetworkPermissions } from '@franklin/lib';
import type { AbsolutePath } from '@franklin/lib';
import type { EnvironmentConfig } from '../../../modules/environment/api/index.js';

const AbsolutePathV1 = z.string().transform((value) => value as AbsolutePath);

const FilesystemPermissionsV1 = z.object({
	allowRead: z.array(z.string()),
	denyRead: z.array(z.string()),
	allowWrite: z.array(z.string()),
	denyWrite: z.array(z.string()),
});

const NetworkPermissionsV1 = z.object({
	allowedDomains: z.array(z.string()),
	deniedDomains: z.array(z.string()),
});

// Frozen pre-v4 SDK default. Obsidian/sidebar used empty lists. Both denied
// local access already, so removing these port rules preserves their behavior.
const legacyDeniedPorts = new Set(
	['localhost', '127.0.0.1', '[::1]'].flatMap((host) =>
		[5005, 5678, 9222, 9229].map((port) => `${host}:${port}`),
	),
);

export const EnvironmentSessionV1 = z.object({
	fsConfig: z.object({
		cwd: AbsolutePathV1,
		permissions: FilesystemPermissionsV1,
	}),
	netConfig: NetworkPermissionsV1.refine(
		({ allowedDomains, deniedDomains }) =>
			allowedDomains.length === 0 &&
			(deniedDomains.length === 0 ||
				(new Set(deniedDomains).size === legacyDeniedPorts.size &&
					deniedDomains.every((entry) => legacyDeniedPorts.has(entry)))),
		'Custom legacy network policy requires explicit reconfiguration; only default policies migrate automatically',
	),
});

export const EnvironmentSessionV2 = EnvironmentSessionV1.extend({
	netConfig: NetworkPermissionsV1.extend({
		allowPublicHosts: z.boolean().optional(),
	}).refine((config) => {
		try {
			validateNetworkPermissions(config);
			return true;
		} catch {
			return false;
		}
	}, 'Invalid host-only network rules'),
}) satisfies z.ZodType<EnvironmentConfig>;
