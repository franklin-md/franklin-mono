import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TransportDemo() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Transport Layer</CardTitle>
					<CardDescription>
						Explore the different transport options available in Franklin. The
						transport layer abstracts how the client communicates with ACP
						agents.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<div className="flex items-start gap-3 rounded-lg border p-4">
							<Badge className="mt-0.5">Stdio</Badge>
							<div>
								<p className="text-sm font-medium">StdioTransport</p>
								<p className="text-sm text-muted-foreground">
									Spawns a subprocess and communicates over stdin/stdout using
									newline-delimited JSON. This is the default transport for
									local agent processes.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border p-4">
							<Badge variant="secondary" className="mt-0.5">
								Memory
							</Badge>
							<div>
								<p className="text-sm font-medium">In-Memory Transport</p>
								<p className="text-sm text-muted-foreground">
									Creates bidirectional Web Streams in memory. Useful for
									testing and for running agents within the same process.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3 rounded-lg border p-4">
							<Badge variant="outline" className="mt-0.5">
								HTTP
							</Badge>
							<div>
								<p className="text-sm font-medium">HTTP Callback Server</p>
								<p className="text-sm text-muted-foreground">
									An HTTP callback server for MCP relay scenarios. Enables
									communication with agents running on remote hosts or in
									containers.
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-lg bg-muted/50 p-4">
						<p className="text-sm text-muted-foreground">
							In the Electron demo, agents run in the main process using{' '}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								StdioTransport
							</code>
							. The renderer communicates with the main process over Electron
							IPC, which then bridges to ACP agents over their respective
							transports.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
