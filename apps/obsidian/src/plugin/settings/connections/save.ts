import {
	mcpServersSchema,
	type AuthManager,
	type MCPServerConfig,
	type SettingsStore,
} from '@franklin/agent';

type SaveOptions = {
	server: MCPServerConfig;
	values: Record<string, string>;
	settings: SettingsStore;
	auth: AuthManager;
};

export async function saveConnection({
	server,
	values,
	settings,
	auth,
}: SaveOptions): Promise<MCPServerConfig> {
	if (Object.values(values).some((value) => /[\r\n]/.test(value)))
		throw new Error('Credential values cannot contain line breaks.');
	const previous = settings.get().mcpServers;
	const old = previous.find((item) => item.id === server.id);
	const changedOrigin =
		old && new URL(old.url).origin !== new URL(server.url).origin;
	let input = server;
	let secrets = values;
	// New origins get fresh secret slots before persistence. Updating an existing slot
	// first could send the new host's key to the old host during an asynchronous save.
	if (changedOrigin && server.authentication.kind === 'headers') {
		const remapped: Record<string, string> = {};
		const headers = server.authentication.headers.map((header) => {
			const id = crypto.randomUUID();
			const value = values[header.id];
			if (value !== undefined) remapped[id] = value;
			return { ...header, id, credentialId: `mcp-${server.id}-${id}` };
		});
		input = { ...server, authentication: { kind: 'headers', headers } };
		secrets = remapped;
	}
	const next = mcpServersSchema.parse([
		...previous.filter((item) => item.id !== server.id),
		input,
	]);
	const saved = next.find((item) => item.id === server.id);
	if (!saved) throw new Error('Saved connection is missing.');
	const headers =
		saved.authentication.kind === 'headers' ? saved.authentication.headers : [];
	const oldHeaders =
		old?.authentication.kind === 'headers' ? old.authentication.headers : [];
	for (const header of headers) {
		const value = secrets[header.id];
		if (value)
			auth.setApiKeyEntry(header.credentialId, { type: 'apiKey', key: value });
		else if (value === '' || changedOrigin)
			auth.removeApiKeyEntry(header.credentialId);
	}
	await auth.persist();
	settings.set((draft) => {
		draft.mcpServers = next;
	});
	await settings.persist();
	for (const header of oldHeaders)
		if (!headers.some((item) => item.credentialId === header.credentialId))
			auth.removeApiKeyEntry(header.credentialId);
	await auth.persist();
	return saved;
}

export async function removeConnection(
	id: string,
	settings: SettingsStore,
	auth: AuthManager,
): Promise<void> {
	const server = settings.get().mcpServers.find((item) => item.id === id);
	settings.set((draft) => {
		draft.mcpServers = draft.mcpServers.filter((item) => item.id !== id);
	});
	await settings.persist();
	if (server?.authentication.kind === 'headers')
		for (const header of server.authentication.headers)
			auth.removeApiKeyEntry(header.credentialId);
	await auth.persist();
}
