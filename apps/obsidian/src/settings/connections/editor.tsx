import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuthManager, useHarness } from '@franklin/react';
import { Button, Input, Label } from '@franklin/ui';
import type { MCPServerConfig } from '@franklin/agent';
import type { MCPConnections } from '@franklin/extension-mcp';
import { ConnectionHeaders } from './headers.js';
import { ConnectionTools } from './tools.js';
import { removeConnection, saveConnection } from './save.js';

type Props = {
	initial: MCPServerConfig;
	connections: MCPConnections;
	isNew?: boolean;
	onDone?: () => void;
};

export function ConnectionEditor({
	initial,
	connections,
	isNew,
	onDone,
}: Props) {
	const auth = useAuthManager();
	const settings = useHarness().settings;
	const [server, setServer] = useState(initial);
	const [values, setValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			(initial.authentication.kind === 'headers'
				? initial.authentication.headers
				: []
			).map((header) => [
				header.id,
				auth.entries()[header.credentialId]?.apiKey?.key ?? '',
			]),
		),
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const [saved, setSaved] = useState(false);
	const activeTest = useRef<AbortController>();
	const status = useSyncExternalStore(connections.subscribe, () =>
		connections.status(server.id),
	);
	useEffect(() => () => activeTest.current?.abort(), []);
	function change(next: MCPServerConfig) {
		setServer(next);
		setSaved(false);
		setError(undefined);
	}
	async function save() {
		setBusy(true);
		setError(undefined);
		try {
			const savedServer = await saveConnection({
				server,
				values,
				settings,
				auth,
			});
			setServer(savedServer);
			setValues(
				Object.fromEntries(
					(savedServer.authentication.kind === 'headers'
						? savedServer.authentication.headers
						: []
					).map((header) => [
						header.id,
						auth.entries()[header.credentialId]?.apiKey?.key ?? '',
					]),
				),
			);
			setSaved(true);
			onDone?.();
		} catch {
			setError(
				'Could not save the connection. Check the HTTPS endpoint, unique header names, and credential values, then retry.',
			);
		} finally {
			setBusy(false);
		}
	}
	async function test() {
		activeTest.current?.abort();
		const controller = new AbortController();
		activeTest.current = controller;
		setBusy(true);
		try {
			await connections.testConnection(server.id, controller.signal);
		} catch {
			setError('Connection test failed. Save the connection and retry.');
		} finally {
			if (activeTest.current === controller) setBusy(false);
		}
	}
	return (
		<div className="my-3 grid min-w-0 gap-3 rounded-md p-3 ring-1 ring-inset ring-[var(--background-modifier-border)]">
			<Label htmlFor={`connection-name-${server.id}`}>Connection name</Label>
			<Input
				id={`connection-name-${server.id}`}
				value={server.name}
				disabled={busy}
				onChange={(event) => change({ ...server, name: event.target.value })}
			/>
			<label className="flex items-center gap-2">
				<input
					type="checkbox"
					disabled={busy}
					checked={server.enabled}
					onChange={(event) =>
						change({ ...server, enabled: event.target.checked })
					}
				/>
				Enable connection
			</label>
			<details open={!server.preset}>
				<summary>Endpoint and authentication</summary>
				<div className="mt-2 grid min-w-0 gap-2">
					<Label htmlFor={`connection-url-${server.id}`}>
						HTTPS MCP endpoint
					</Label>
					<Input
						id={`connection-url-${server.id}`}
						value={server.url}
						disabled={busy}
						onChange={(event) => {
							const url = event.target.value;
							try {
								if (new URL(url).origin !== new URL(server.url).origin)
									setValues({});
							} catch {
								/* Validate the completed URL on save. */
							}
							change({ ...server, url });
						}}
					/>
					<p className="text-sm text-muted-foreground">
						Changing the server host clears its key. Save before testing.
					</p>
				</div>
			</details>
			<ConnectionHeaders
				server={server}
				values={values}
				disabled={busy}
				onChange={(next, nextValues) => {
					change(next);
					setValues(nextValues);
				}}
			/>
			<ConnectionTools
				server={server}
				tools={status.tools ?? []}
				disabled={busy}
				onChange={change}
			/>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					disabled={busy}
					onClick={() => void save()}
				>
					Save connection
				</Button>
				{!isNew && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={
							busy ||
							(!saved && JSON.stringify(server) !== JSON.stringify(initial))
						}
						onClick={() => void test()}
					>
						Test connection
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={busy}
					onClick={() => {
						if (isNew) {
							onDone?.();
							return;
						}
						setBusy(true);
						void removeConnection(server.id, settings, auth)
							.catch(() => setError('Could not remove the connection. Retry.'))
							.finally(() => setBusy(false));
					}}
				>
					{isNew ? 'Cancel' : 'Remove connection'}
				</Button>
			</div>
			<p role="status" className="break-words text-sm">
				{saved ? 'Connection saved. ' : ''}
				{status.message ?? status.state}
				{status.checkedAt
					? ` · Last checked ${new Date(status.checkedAt).toLocaleString()}`
					: ''}
			</p>
			{error && (
				<p role="alert" className="text-[var(--text-error)]">
					{error}
				</p>
			)}
		</div>
	);
}
