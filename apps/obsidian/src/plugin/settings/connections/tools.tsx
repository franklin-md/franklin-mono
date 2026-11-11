import type { MCPServerConfig } from '@franklin/agent';

type Props = {
	server: MCPServerConfig;
	tools: Array<{ name: string; description: string }>;
	onChange: (server: MCPServerConfig) => void;
	disabled: boolean;
};
const exaLabels: Readonly<Record<string, string>> = {
	web_search_exa: 'Web search',
	web_fetch_exa: 'Read pages',
	web_search_advanced_exa: 'Advanced search',
	agent_run: 'Research agent — uses Exa credits',
};
const exaTools = [
	{ name: 'web_search_exa', description: 'Find relevant web sources.' },
	{ name: 'web_fetch_exa', description: 'Read known URLs.' },
	{
		name: 'web_search_advanced_exa',
		description: 'Filter by domain, date, category and more.',
	},
	{
		name: 'agent_run',
		description: 'Multi-step research with structured results.',
	},
];

export function ConnectionTools({ server, tools, onChange, disabled }: Props) {
	const listed = new Map(
		[...(server.preset === 'exa' ? exaTools : []), ...tools].map((tool) => [
			tool.name,
			tool,
		]),
	);
	for (const name of server.enabledTools)
		if (!listed.has(name))
			listed.set(name, {
				name,
				description: 'Previously selected tool; refresh to check availability.',
			});
	return (
		<fieldset
			disabled={disabled}
			className="m-0 grid min-w-0 gap-2 border-0 p-0"
		>
			<legend>Allowed tools</legend>
			{!listed.size && (
				<p>
					Save and test this connection to discover its tools. Newly discovered
					tools start disabled.
				</p>
			)}
			{[...listed.values()].map((tool) => (
				<label
					key={tool.name}
					className="flex min-w-0 items-start gap-2 break-words"
				>
					<input
						type="checkbox"
						checked={server.enabledTools.includes(tool.name)}
						onChange={(event) =>
							onChange({
								...server,
								enabledTools: event.target.checked
									? [...server.enabledTools, tool.name]
									: server.enabledTools.filter((name) => name !== tool.name),
							})
						}
					/>
					<span>
						{server.preset === 'exa'
							? (exaLabels[tool.name] ?? tool.name)
							: tool.name}
						<small className="block text-muted-foreground">
							{tool.description}
						</small>
					</span>
				</label>
			))}
		</fieldset>
	);
}
