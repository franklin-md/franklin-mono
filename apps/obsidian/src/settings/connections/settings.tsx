import { useState, useSyncExternalStore } from 'react';
import { useSettings } from '@franklin/react';
import { Button } from '@franklin/ui';
import {
	createExaConnection,
	type MCPConnections,
} from '@franklin/extension-mcp';
import type { MCPServerConfig } from '@franklin/agent';
import { ConnectionEditor } from './editor.js';

type Props = { connections: MCPConnections };

export function ConnectionSettings({ connections }: Props) {
	const settings = useSettings();
	const servers = useSyncExternalStore(
		(notify) => settings.subscribe(notify),
		() => settings.get().mcpServers,
	);
	const [adding, setAdding] = useState<MCPServerConfig>();
	return (
		<div className="min-w-0">
			<p>
				Connect research tools to Franklin. Exa can save research as a Markdown
				table and optionally export CSV. Credentials use Obsidian secret storage
				when available.
			</p>
			{servers.map((server) => (
				<ConnectionEditor
					key={server.id}
					initial={server}
					connections={connections}
				/>
			))}
			{adding ? (
				<ConnectionEditor
					key={adding.id}
					initial={adding}
					connections={connections}
					isNew
					onDone={() => setAdding(undefined)}
				/>
			) : (
				<div className="my-3 flex flex-wrap gap-2">
					{!servers.some((server) => server.preset === 'exa') && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setAdding(createExaConnection())}
						>
							Add Exa
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setAdding({
								id: crypto.randomUUID(),
								name: '',
								url: '',
								enabled: true,
								authentication: { kind: 'none' },
								enabledTools: [],
							})
						}
					>
						Add remote connection
					</Button>
				</div>
			)}
		</div>
	);
}
