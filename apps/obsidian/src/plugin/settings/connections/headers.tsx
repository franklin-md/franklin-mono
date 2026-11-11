import { Button, Input, Label } from '@franklin/ui';
import type { MCPServerConfig } from '@franklin/agent';

type Headers = Extract<
	MCPServerConfig['authentication'],
	{ kind: 'headers' }
>['headers'];
type Props = {
	server: MCPServerConfig;
	values: Record<string, string>;
	onChange: (server: MCPServerConfig, values: Record<string, string>) => void;
	disabled: boolean;
};

export function ConnectionHeaders({
	server,
	values,
	onChange,
	disabled,
}: Props) {
	const headers =
		server.authentication.kind === 'headers'
			? server.authentication.headers
			: [];
	const preset = server.preset === 'exa';
	function changeHeaders(next: Headers) {
		onChange(
			{
				...server,
				authentication: next.length
					? { kind: 'headers', headers: next }
					: { kind: 'none' },
			},
			values,
		);
	}
	function addHeader() {
		const id = crypto.randomUUID();
		changeHeaders([
			...headers,
			{
				id,
				name: preset ? 'x-api-key' : '',
				credentialId: `mcp-${server.id}-${id}`,
			},
		]);
	}
	return (
		<fieldset
			disabled={disabled}
			className="m-0 grid min-w-0 gap-2 border-0 p-0"
		>
			<legend>{preset ? 'Credentials' : 'Secret headers'}</legend>
			{headers.map((header) => (
				<div key={header.id} className="m-0 grid min-w-0 gap-2 border-0 p-0">
					{!preset && (
						<>
							<Label htmlFor={`header-name-${header.id}`}>Header name</Label>
							<Input
								id={`header-name-${header.id}`}
								value={header.name}
								onChange={(event) =>
									changeHeaders(
										headers.map((item) =>
											item.id === header.id
												? { ...item, name: event.target.value }
												: item,
										),
									)
								}
							/>
						</>
					)}
					<Label htmlFor={`header-value-${header.id}`}>
						{preset ? 'Exa API key' : `${header.name || 'Header'} value`}
					</Label>
					<Input
						id={`header-value-${header.id}`}
						type="password"
						autoComplete="off"
						value={values[header.id] ?? ''}
						onChange={(event) =>
							onChange(server, { ...values, [header.id]: event.target.value })
						}
					/>
					{!preset && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								changeHeaders(headers.filter((item) => item.id !== header.id))
							}
						>
							Remove header
						</Button>
					)}
				</div>
			))}
			{(!preset || !headers.length) && (
				<Button type="button" variant="outline" size="sm" onClick={addHeader}>
					{preset ? 'Add API key' : 'Add secret header'}
				</Button>
			)}
		</fieldset>
	);
}
