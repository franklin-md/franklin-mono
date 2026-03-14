import { z } from 'zod';
import { createLocalMcp } from '@franklin/local-mcp/browser';

import type { McpServer } from '@agentclientprotocol/sdk';
import type {
	AnyToolDefinition,
	LocalMcp,
	LocalMcpTransport,
} from '@franklin/local-mcp/browser';
import type {
	FranklinModule,
	ModuleCreateContext,
	ModuleCreateResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Thread module options
// ---------------------------------------------------------------------------

export interface ThreadRequest {
	/** Description of the task for the new thread. */
	task: string;
	/** Working directory for the new thread (defaults to session cwd). */
	cwd?: string;
}

export interface ThreadModuleOptions {
	/** Called when the agent requests a new thread. */
	onNewThread: (request: ThreadRequest) => Promise<{ threadId: string }>;
	/**
	 * MCP transport used to serve the thread tool.
	 * Each module instance must receive its own transport — do not reuse
	 * a transport instance across module lifetimes.
	 */
	transport: LocalMcpTransport;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const THREAD_SYSTEM_PROMPT = `You have access to a "new_thread" tool that spawns an independent thread for a task.

Use new_thread when:
- A subtask is independent and can run in parallel with your current work.
- A task involves a different area of the codebase that would benefit from a fresh context.
- You want to delegate a well-defined piece of work without blocking your current flow.

Do NOT use new_thread when:
- The task depends on your current context or in-progress work.
- The task is small enough to handle inline.

Each thread runs in its own session with its own agent. You will not see the thread's output directly.`;

// ---------------------------------------------------------------------------
// createThreadModule
// ---------------------------------------------------------------------------

const threadInputSchema = z.object({
	task: z.string().describe('Description of the task for the new thread.'),
	cwd: z
		.string()
		.optional()
		.describe(
			'Working directory for the new thread. Defaults to the current session cwd.',
		),
});

export function createThreadModule(
	options: ThreadModuleOptions,
): FranklinModule {
	let mcp: LocalMcp | undefined;

	return {
		name: 'thread',

		async onCreate(ctx: ModuleCreateContext): Promise<ModuleCreateResult> {
			const transport = options.transport;

			// Cast needed: TypeScript resolves zod v4 (hoisted) but runtime uses
			// zod v3 (nested under agent). The types are structurally identical.
			const tools: AnyToolDefinition[] = [
				{
					name: 'new_thread',
					description:
						'Spawn an independent thread to handle a task in a separate session.',
					schema: threadInputSchema,
					handler: async (args: z.infer<typeof threadInputSchema>) => {
						return options.onNewThread(args);
					},
				} as unknown as AnyToolDefinition,
			];

			mcp = await createLocalMcp(
				{ name: 'franklin-threads', tools },
				transport,
			);

			ctx.systemPrompt.append(THREAD_SYSTEM_PROMPT);

			return {
				mcpServers: [mcp.config as McpServer],
			};
		},

		async onDispose() {
			await mcp?.dispose();
			mcp = undefined;
		},
	};
}
