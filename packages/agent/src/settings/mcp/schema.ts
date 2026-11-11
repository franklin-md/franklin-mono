import { z } from 'zod';

const forbiddenHeaders = new Set([
	'host',
	'content-length',
	'content-type',
	'accept',
	'cookie',
	'mcp-session-id',
	'mcp-protocol-version',
	'connection',
	'transfer-encoding',
]);
const uuid = z.uuid().toLowerCase();
const header = z.object({
	id: uuid,
	name: z
		.string()
		.regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/)
		.refine(
			(name) => !forbiddenHeaders.has(name.toLowerCase()),
			'Header is reserved for the transport',
		),
	credentialId: z.string(),
});

export const mcpServerSchema = z
	.object({
		id: uuid,
		name: z.string().trim().min(1).max(80),
		preset: z.literal('exa').optional(),
		url: z
			.url()
			.max(2048)
			.refine((value) => {
				const url = new URL(value);
				return (
					url.protocol === 'https:' &&
					!url.username &&
					!url.password &&
					!url.hash &&
					![...url.searchParams.keys()].some((key) =>
						/key|token|secret|password|authorization/i.test(key),
					)
				);
			}, 'Use an HTTPS endpoint without embedded credentials'),
		enabled: z.boolean(),
		authentication: z.discriminatedUnion('kind', [
			z.object({ kind: z.literal('none') }),
			z.object({
				kind: z.literal('headers'),
				headers: z.array(header).min(1).max(8),
			}),
		]),
		enabledTools: z.array(z.string().min(1).max(256)).max(100),
	})
	.superRefine((server, ctx) => {
		if (server.authentication.kind !== 'headers') return;
		const names = new Set<string>();
		const ids = new Set<string>();
		for (const item of server.authentication.headers) {
			if (
				names.has(item.name.toLowerCase()) ||
				ids.has(item.id) ||
				item.credentialId !== `mcp-${server.id}-${item.id}`
			)
				ctx.addIssue({
					code: 'custom',
					message:
						'Header identities must be unique and belong to this connection',
				});
			names.add(item.name.toLowerCase());
			ids.add(item.id);
		}
	});

export const mcpServersSchema = z
	.array(mcpServerSchema)
	.max(10)
	.superRefine((servers, ctx) => {
		if (
			new Set(servers.map((server) => server.id)).size !== servers.length ||
			servers.filter((server) => server.preset === 'exa').length > 1
		)
			ctx.addIssue({
				code: 'custom',
				message: 'Connection IDs and the Exa preset must be unique',
			});
	});
