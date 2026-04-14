import { useEffect, useState, type FormEvent } from 'react';

import type { AuthEntries, ApiKeyEntry } from '@franklin/agent/browser';
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@franklin/ui';
import { useAsync } from '@franklin/react';

import { useAuthManager } from './context.js';
import type { OAuthProviderMeta } from './oauth-panel.js';

// ---------------------------------------------------------------------------
// MaskedKey — show/hide the stored key
// ---------------------------------------------------------------------------

function MaskedKey({ value }: { value: string }) {
	const [revealed, setRevealed] = useState(false);
	const masked = `${value.slice(0, 4)}${'•'.repeat(Math.min(20, Math.max(0, value.length - 4)))}`;

	return (
		<span className="font-mono text-sm">
			{revealed ? value : masked}
			<button
				onClick={() => {
					setRevealed((r) => !r);
				}}
				className="ml-1.5 cursor-pointer text-xs text-primary hover:underline"
			>
				{revealed ? 'Hide' : 'Show'}
			</button>
		</span>
	);
}

// ---------------------------------------------------------------------------
// ApiKeyPanel
// ---------------------------------------------------------------------------

/**
 * Displays all stored API-key entries and provides a form to add new ones.
 *
 * `savedEntries` is owned by the parent — the panel never reads from disk.
 * `onUpdate` is called after any mutation so the parent can reload and re-pass entries.
 */
export function ApiKeyPanel({
	savedEntries,
	onUpdate,
}: {
	savedEntries: AuthEntries;
	onUpdate: () => Promise<void>;
}) {
	const auth = useAuthManager();
	const providers = useAsync(
		async (): Promise<OAuthProviderMeta[]> =>
			(await auth.getApiKeyProviders()).map((id) => ({ id, name: id })),
		[],
		[auth],
	);

	const [provider, setProvider] = useState(providers[0]?.id ?? '');
	const [key, setKey] = useState('');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!provider && providers[0]) {
			setProvider(providers[0].id);
		}
	}, [provider, providers]);

	const apiKeyEntries = Object.entries(savedEntries).filter(([, entry]) =>
		Boolean(entry.apiKey),
	) as [
		string,
		AuthEntries[string] & { apiKey: { type: 'apiKey'; key: string } },
	][];

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!provider.trim()) {
			setError('Provider name is required');
			return;
		}
		if (!key.trim()) {
			setError('API key is required');
			return;
		}
		const entry: ApiKeyEntry = { type: 'apiKey', key: key.trim() };
		auth.setApiKeyEntry(provider.trim(), entry);
		setProvider('');
		setKey('');
		setError(null);
		await onUpdate();
	}

	async function handleRemove(providerId: string) {
		auth.removeApiKeyEntry(providerId);
		await onUpdate();
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Existing keys table */}
			{apiKeyEntries.length > 0 && (
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="border-b border-border">
							<th className="px-2 py-1.5 text-left font-semibold text-foreground">
								Provider
							</th>
							<th className="px-2 py-1.5 text-left font-semibold text-foreground">
								Key
							</th>
							<th className="w-[60px] px-2 py-1.5"></th>
						</tr>
					</thead>
					<tbody>
						{apiKeyEntries.map(([id, entry]) => (
							<tr key={id} className="border-b border-border/50">
								<td className="px-2 py-2 text-foreground">{id}</td>
								<td className="px-2 py-2">
									<MaskedKey value={entry.apiKey.key} />
								</td>
								<td className="px-2 py-2">
									<Button
										variant="outline"
										size="sm"
										className="text-destructive"
										onClick={() => {
											void handleRemove(id);
										}}
									>
										Remove
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{/* Add key form */}
			<div
				className={
					apiKeyEntries.length > 0 ? 'border-t border-border pt-3' : ''
				}
			>
				<p className="mb-2.5 text-sm font-medium text-foreground">
					Add API Key
				</p>
				<form onSubmit={handleSubmit} className="flex flex-col gap-2">
					<Select
						value={provider}
						onValueChange={(value) => {
							setProvider(value);
							setError(null);
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select a provider" />
						</SelectTrigger>
						<SelectContent>
							{providers.map((providerOption) => (
								<SelectItem key={providerOption.id} value={providerOption.id}>
									{providerOption.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						type="password"
						placeholder="API Key"
						value={key}
						onChange={(e) => {
							setKey(e.currentTarget.value);
							setError(null);
						}}
					/>
					{error && <p className="text-xs text-destructive">{error}</p>}
					<div>
						<Button type="submit" size="sm">
							Save
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
