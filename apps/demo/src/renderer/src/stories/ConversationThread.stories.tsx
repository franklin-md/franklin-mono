import type { Meta, StoryObj } from '@storybook/react-vite';

import { MessageBubble } from '@/components/conversation/message-bubble';
import { PlanPanel } from '@/components/conversation/plan-panel';
import { ThoughtBlock } from '@/components/conversation/thought-block';
import { ToolCallCard } from '@/components/conversation/tool-call-card';
import { UsageBar } from '@/components/conversation/usage-bar';

// ---------------------------------------------------------------------------
// Dummy wrapper so Storybook has a component to attach meta to
// ---------------------------------------------------------------------------

function ConversationThread({ children }: { children?: React.ReactNode }) {
	return <div className="mx-auto max-w-2xl space-y-3 p-4">{children}</div>;
}

const meta = {
	title: 'Conversation/ConversationThread',
	component: ConversationThread,
	parameters: { layout: 'padded' },
} satisfies Meta<typeof ConversationThread>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Full Conversation — realistic multi-turn coding agent session
// ---------------------------------------------------------------------------

export const FullConversation: Story = {
	render: () => (
		<ConversationThread>
			{/* Turn 1: User asks to refactor */}
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Refactor the `createAgent` function in `src/lib/agent.ts` to use async/await instead of callbacks. Also add proper error handling.',
					isStreaming: false,
				}}
			/>

			{/* Turn 1: Agent thinks */}
			<ThoughtBlock
				thought={{
					id: 't1',
					text: 'The user wants me to refactor createAgent to async/await. Let me first read the current implementation to understand the callback pattern, then plan the refactor. I should also check for any callers of this function to make sure the change is compatible.',
					isStreaming: false,
				}}
			/>

			{/* Turn 1: Agent reads the file */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Read src/lib/agent.ts',
					kind: 'read',
					status: 'completed',
					rawOutput:
						'import { spawn } from "child_process";\nimport type { AgentSpec } from "./types";\n\nexport function createAgent(\n  spec: AgentSpec,\n  callback: (err: Error | null, agent?: Agent) => void\n) {\n  const proc = spawn(spec.command, spec.args);\n  proc.on("error", (err) => callback(err));\n  proc.on("ready", () => {\n    callback(null, new Agent(proc));\n  });\n}',
				}}
			/>

			{/* Turn 1: Agent searches for callers */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc2',
					title: 'Search for "createAgent" references',
					kind: 'search',
					status: 'completed',
					rawInput: { pattern: 'createAgent', include: '**/*.ts' },
					rawOutput:
						'src/lib/agent.ts:5: export function createAgent(\nsrc/server/handler.ts:12: createAgent(spec, (err, agent) => {\nsrc/__tests__/agent.test.ts:8: createAgent(testSpec, (err, agent) => {',
				}}
			/>

			{/* Turn 1: Agent creates plan */}
			<PlanPanel
				plan={{
					entries: [
						{
							content: 'Convert createAgent to async/await',
							status: 'completed',
							priority: 'high',
						},
						{
							content: 'Add try/catch error handling',
							status: 'completed',
							priority: 'high',
						},
						{
							content: 'Update callers in handler.ts',
							status: 'completed',
							priority: 'medium',
						},
						{
							content: 'Update tests',
							status: 'in_progress',
							priority: 'medium',
						},
						{
							content: 'Run test suite',
							status: 'pending',
							priority: 'low',
						},
					],
				}}
			/>

			{/* Turn 1: Agent edits the file */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc3',
					title: 'Edit src/lib/agent.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/lib/agent.ts',
							oldText:
								'export function createAgent(\n  spec: AgentSpec,\n  callback: (err: Error | null, agent?: Agent) => void\n) {\n  const proc = spawn(spec.command, spec.args);\n  proc.on("error", (err) => callback(err));\n  proc.on("ready", () => {\n    callback(null, new Agent(proc));\n  });\n}',
							newText:
								'export async function createAgent(spec: AgentSpec): Promise<Agent> {\n  const proc = spawn(spec.command, spec.args);\n\n  try {\n    await waitForReady(proc);\n    return new Agent(proc);\n  } catch (err) {\n    proc.kill();\n    throw new AgentSpawnError(\n      `Failed to spawn agent "${spec.name}": ${err instanceof Error ? err.message : String(err)}`,\n      { cause: err },\n    );\n  }\n}',
						},
					],
				}}
			/>

			{/* Turn 1: Agent responds */}
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: "I've refactored `createAgent` to use async/await with proper error handling. The key changes:\n\n1. **Removed callback** — now returns `Promise<Agent>`\n2. **Added `try/catch`** — wraps the spawn in error handling\n3. **Custom error class** — `AgentSpawnError` with cause chaining\n4. **Cleanup on failure** — kills the subprocess if spawn fails\n\nNow let me update the callers.",
					isStreaming: false,
				}}
			/>

			{/* Turn 2: Agent updates caller */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc4',
					title: 'Edit src/server/handler.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/server/handler.ts',
							oldText:
								'createAgent(spec, (err, agent) => {\n  if (err) {\n    res.status(500).json({ error: err.message });\n    return;\n  }\n  sessions.set(id, agent!);\n  res.json({ id });\n});',
							newText:
								'try {\n  const agent = await createAgent(spec);\n  sessions.set(id, agent);\n  res.json({ id });\n} catch (err) {\n  const message = err instanceof Error ? err.message : "Unknown error";\n  res.status(500).json({ error: message });\n}',
						},
					],
				}}
			/>

			{/* Turn 2: Agent runs tests */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc5',
					title: 'Run npm test',
					kind: 'execute',
					status: 'completed',
					rawInput: { command: 'npm test' },
					rawOutput:
						' PASS  src/__tests__/agent.test.ts\n  Agent\n    ✓ spawns subprocess (12ms)\n    ✓ handles ready signal (8ms)\n    ✓ throws on spawn failure (5ms)\n    ✓ kills process on error (3ms)\n\n PASS  src/__tests__/handler.test.ts\n  Handler\n    ✓ creates session (22ms)\n    ✓ returns 500 on spawn error (15ms)\n\nTest Suites: 2 passed, 2 total\nTests:       6 passed, 6 total\nTime:        1.234s',
				}}
			/>

			{/* Turn 2: Final assistant message */}
			<MessageBubble
				message={{
					id: 'a2',
					role: 'assistant',
					text: 'All done! The refactoring is complete and all 6 tests pass. The codebase now uses async/await consistently with proper error handling and subprocess cleanup.',
					isStreaming: false,
				}}
			/>

			{/* Usage bar */}
			<UsageBar
				usage={{
					used: 18_432,
					size: 200_000,
					cost: { amount: 0.0847, currency: '$' },
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Streaming — mid-response with active tool call and streaming message
// ---------------------------------------------------------------------------

export const StreamingInProgress: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Find all TODO comments in the codebase and create a summary.',
					isStreaming: false,
				}}
			/>

			<ThoughtBlock
				thought={{
					id: 't1',
					text: 'I need to search for TODO comments across the entire codebase. Let me use a grep search with a broad pattern to catch different TODO formats like TODO, FIXME, HACK, XXX...',
					isStreaming: true,
				}}
			/>

			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Search for TODO|FIXME|HACK|XXX comments',
					kind: 'search',
					status: 'in_progress',
				}}
			/>

			<UsageBar
				usage={{
					used: 3_200,
					size: 200_000,
					cost: { amount: 0.0102, currency: '$' },
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Very long user message
// ---------------------------------------------------------------------------

const VERY_LONG_USER_MESSAGE = `I need help with a complex migration. Here's the full context:

We're currently running PostgreSQL 14.2 with a schema that was designed 3 years ago. The main tables are:

- \`users\` (id, email, name, created_at, updated_at, deleted_at, org_id, role, preferences JSONB, metadata JSONB)
- \`organizations\` (id, name, slug, plan, billing_email, stripe_customer_id, created_at)
- \`projects\` (id, org_id, name, description, settings JSONB, created_at, archived_at)
- \`documents\` (id, project_id, title, content TEXT, version INT, created_by, created_at, updated_at)
- \`document_versions\` (id, document_id, content TEXT, version INT, diff JSONB, created_by, created_at)
- \`comments\` (id, document_id, user_id, content TEXT, resolved BOOLEAN, parent_id, created_at)
- \`audit_log\` (id, org_id, user_id, action VARCHAR, resource_type VARCHAR, resource_id UUID, metadata JSONB, created_at)

The audit_log table alone has 847 million rows and is growing by ~2M/day. The documents table has about 12M rows with an average content size of 45KB. The document_versions table has 89M rows.

We need to:
1. Split the monolithic schema into microservice-compatible boundaries
2. Add row-level security for multi-tenant isolation
3. Migrate the audit_log to TimescaleDB for better time-series performance
4. Add full-text search indexes on documents.content
5. Implement CDC (Change Data Capture) for real-time sync to Elasticsearch
6. Zero-downtime migration — we have 99.99% SLA

Our current connection pool is maxed at 200 connections with PgBouncer. Peak QPS is around 15,000.

Can you help me plan this migration? I want a phased approach with rollback strategies for each phase.`;

export const VeryLongUserMessage: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: VERY_LONG_USER_MESSAGE,
					isStreaming: false,
				}}
			/>
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: "This is a significant migration. Let me break it into phases with rollback strategies for each.\n\n## Phase 1: Audit Log Migration to TimescaleDB\n\nThis is the highest-impact, lowest-risk change since audit logs are append-only.\n\n```sql\n-- Create hypertable\nSELECT create_hypertable('audit_log_ts', 'created_at',\n  chunk_time_interval => INTERVAL '1 day',\n  migrate_data => false\n);\n\n-- Backfill in batches (avoid locking)\nINSERT INTO audit_log_ts\nSELECT * FROM audit_log\nWHERE created_at >= NOW() - INTERVAL '90 days'\nORDER BY created_at;\n```\n\n**Rollback**: Keep original table, swap back with a view rename.\n\n## Phase 2: Row-Level Security\n\n```sql\nALTER TABLE projects ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY org_isolation ON projects\n  USING (org_id = current_setting('app.current_org_id')::uuid);\n```\n\n**Rollback**: `ALTER TABLE projects DISABLE ROW LEVEL SECURITY;`",
					isStreaming: false,
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Very long assistant message with lots of code
// ---------------------------------------------------------------------------

const VERY_LONG_ASSISTANT_MESSAGE = `Here's the complete implementation of the middleware stack with all the layers:

## 1. History Middleware

The history middleware captures all bidirectional events between the client and agent:

\`\`\`typescript
import type { Agent, Client, SessionUpdate } from '@agentclientprotocol/sdk';

interface HistoryEntry {
  id: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  update: SessionUpdate;
}

export class HistoryMiddleware implements Agent {
  private entries: HistoryEntry[] = [];
  private listeners = new Set<(entry: HistoryEntry) => void>();

  constructor(private inner: Agent) {}

  async prompt(message: string): Promise<void> {
    this.record({
      direction: 'outbound',
      update: {
        sessionUpdate: 'user_message_chunk',
        content: { type: 'text', text: message },
      },
    });
    return this.inner.prompt(message);
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (event === 'session_update') {
      this.inner.on(event, (update: SessionUpdate) => {
        this.record({ direction: 'inbound', update });
        handler(update);
      });
    } else {
      this.inner.on(event, handler);
    }
  }

  private record(partial: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...partial,
    };
    this.entries.push(entry);
    for (const listener of this.listeners) {
      listener(entry);
    }
  }

  get history(): readonly HistoryEntry[] {
    return this.entries;
  }
}
\`\`\`

## 2. Modules Middleware

The modules middleware injects MCP servers and prompt context from Franklin modules:

\`\`\`typescript
import type { FranklinModule, ModuleContext } from '../types';

export class ModulesMiddleware implements Agent {
  private modules: FranklinModule[] = [];
  private mcpConnections = new Map<string, McpConnection>();

  constructor(
    private inner: Agent,
    modules: FranklinModule[],
  ) {
    this.modules = modules;
  }

  async initialize(): Promise<void> {
    for (const mod of this.modules) {
      if (mod.mcpServers) {
        for (const [name, config] of Object.entries(mod.mcpServers)) {
          const conn = await McpConnection.create(config);
          this.mcpConnections.set(name, conn);
        }
      }
      await mod.onCreate?.({ agent: this.inner });
    }
  }

  async prompt(message: string): Promise<void> {
    // Run onPrompt hooks to potentially modify the message
    let finalMessage = message;
    for (const mod of this.modules) {
      const result = await mod.onPrompt?.({
        message: finalMessage,
        agent: this.inner,
      });
      if (result?.message) {
        finalMessage = result.message;
      }
    }
    return this.inner.prompt(finalMessage);
  }

  async dispose(): Promise<void> {
    for (const conn of this.mcpConnections.values()) {
      await conn.close();
    }
  }
}
\`\`\`

## 3. Permissions Middleware

\`\`\`typescript
import type { PermissionPolicy, PermissionRequest } from '../types';

export class PermissionsMiddleware implements Agent {
  private pendingRequests = new Map<string, {
    request: PermissionRequest;
    resolve: (allowed: boolean) => void;
  }>();

  constructor(
    private inner: Agent,
    private policy: PermissionPolicy,
  ) {}

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (event === 'permission_request') {
      this.inner.on(event, async (request: PermissionRequest) => {
        const autoResult = await this.policy.evaluate(request);
        if (autoResult !== 'ask') {
          // Auto-resolve based on policy
          this.inner.resolvePermission(request.id, autoResult === 'allow');
          return;
        }
        // Bubble up to app for user decision
        handler(request);
      });
    } else {
      this.inner.on(event, handler);
    }
  }
}
\`\`\`

This gives you a full middleware stack that handles history capture, module injection, and permission management — all composable and testable independently.`;

export const VeryLongAssistantMessage: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Can you show me how the full middleware stack is implemented?',
					isStreaming: false,
				}}
			/>
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: VERY_LONG_ASSISTANT_MESSAGE,
					isStreaming: false,
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Very large tool output
// ---------------------------------------------------------------------------

function generateLargeTestOutput(numTests: number): string {
	const suites = [
		'agent',
		'handler',
		'middleware',
		'transport',
		'protocol',
		'history',
		'modules',
		'permissions',
		'session',
		'registry',
	];
	const lines: string[] = [];

	for (const suite of suites) {
		lines.push(` PASS  src/__tests__/${suite}.test.ts`);
		lines.push(`  ${suite.charAt(0).toUpperCase() + suite.slice(1)}`);
		const count = Math.ceil(numTests / suites.length);
		for (let i = 0; i < count; i++) {
			const time = Math.floor(Math.random() * 50) + 1;
			lines.push(`    ✓ ${getTestName(suite, i)} (${time}ms)`);
		}
		lines.push('');
	}

	lines.push(`Test Suites: ${suites.length} passed, ${suites.length} total`);
	lines.push(`Tests:       ${numTests} passed, ${numTests} total`);
	lines.push(`Snapshots:   0 total`);
	lines.push(`Time:        ${(numTests * 0.08).toFixed(1)}s`);

	return lines.join('\n');
}

function getTestName(suite: string, index: number): string {
	const names: Record<string, string[]> = {
		agent: [
			'spawns subprocess',
			'handles ready signal',
			'cleans up on dispose',
			'reconnects after disconnect',
			'queues messages during reconnection',
		],
		handler: [
			'creates session',
			'returns 500 on error',
			'validates input schema',
			'rate limits requests',
			'handles concurrent sessions',
		],
		middleware: [
			'composes in correct order',
			'passes context through chain',
			'handles async middleware',
			'short-circuits on error',
			'supports conditional middleware',
		],
		transport: [
			'establishes stdio connection',
			'handles JSON-RPC framing',
			'reconnects on pipe break',
			'buffers during backpressure',
			'graceful shutdown',
		],
		protocol: [
			'validates message schema',
			'handles unknown methods',
			'supports batch requests',
			'enforces version compatibility',
			'serializes binary content',
		],
		history: [
			'records all events',
			'maintains order',
			'supports replay',
			'handles concurrent writes',
			'prunes old entries',
		],
		modules: [
			'loads module config',
			'injects MCP servers',
			'runs lifecycle hooks',
			'handles module errors',
			'supports hot reload',
		],
		permissions: [
			'evaluates policy rules',
			'caches decisions',
			'prompts for unknown tools',
			'supports wildcard patterns',
			'audits permission grants',
		],
		session: [
			'persists across restarts',
			'handles snapshot restore',
			'garbage collects stale sessions',
			'supports metadata updates',
			'emits lifecycle events',
		],
		registry: [
			'discovers local agents',
			'validates agent specs',
			'handles version conflicts',
			'supports scoped packages',
			'caches registry lookups',
		],
	};
	const suiteNames = names[suite] ?? ['test case'];
	return suiteNames[index % suiteNames.length] ?? 'test case';
}

export const VeryLargeToolOutput: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Run the full test suite.',
					isStreaming: false,
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Run npm test -- --verbose',
					kind: 'execute',
					status: 'completed',
					rawInput: { command: 'npm test -- --verbose' },
					rawOutput: generateLargeTestOutput(50),
				}}
			/>
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: 'All 50 tests across 10 suites pass.',
					isStreaming: false,
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Failed tool calls and error recovery
// ---------------------------------------------------------------------------

export const ErrorRecovery: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Build the project and fix any errors.',
					isStreaming: false,
				}}
			/>

			{/* First attempt fails */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Run npm run build',
					kind: 'execute',
					status: 'failed',
					rawInput: { command: 'npm run build' },
					rawOutput: `src/lib/agent.ts:42:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'AgentSpec'.

42     createAgent("invalid-spec");
       ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/server/handler.ts:18:3 - error TS2554: Expected 1 arguments, but got 2.

18   createAgent(spec, callback);
     ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/middleware.ts:67:12 - error TS2339: Property 'dispose' does not exist on type 'Agent'.

67     agent.dispose();
              ~~~~~~~

Found 3 errors in 3 files.`,
				}}
			/>

			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: "The build found 3 TypeScript errors. Let me fix them one by one:\n\n1. `agent.ts:42` — passing string instead of `AgentSpec`\n2. `handler.ts:18` — still using old callback signature\n3. `middleware.ts:67` — calling `dispose()` which isn't on the `Agent` interface",
					isStreaming: false,
				}}
			/>

			{/* Fix 1 */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc2',
					title: 'Edit src/lib/agent.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/lib/agent.ts',
							oldText: 'createAgent("invalid-spec");',
							newText:
								'createAgent({ name: "test", command: "node", args: ["agent.js"] });',
						},
					],
				}}
			/>

			{/* Fix 2 */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc3',
					title: 'Edit src/server/handler.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/server/handler.ts',
							oldText: 'createAgent(spec, callback);',
							newText: 'const agent = await createAgent(spec);',
						},
					],
				}}
			/>

			{/* Fix 3 */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc4',
					title: 'Edit src/lib/middleware.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/lib/middleware.ts',
							oldText: 'agent.dispose();',
							newText:
								"if ('dispose' in agent && typeof agent.dispose === 'function') {\n  await agent.dispose();\n}",
						},
					],
				}}
			/>

			{/* Retry build succeeds */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc5',
					title: 'Run npm run build',
					kind: 'execute',
					status: 'completed',
					rawInput: { command: 'npm run build' },
					rawOutput:
						'Successfully compiled 24 files with TypeScript.\nBuild complete in 2.3s.',
				}}
			/>

			<MessageBubble
				message={{
					id: 'a2',
					role: 'assistant',
					text: 'All 3 TypeScript errors are fixed and the build succeeds.',
					isStreaming: false,
				}}
			/>

			<UsageBar
				usage={{
					used: 45_000,
					size: 200_000,
					cost: { amount: 0.1923, currency: '$' },
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Many rapid tool calls (file exploration)
// ---------------------------------------------------------------------------

export const RapidToolCalls: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'What files are in the src/lib directory? Give me a quick overview.',
					isStreaming: false,
				}}
			/>

			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Search src/lib/**/*.ts',
					kind: 'search',
					status: 'completed',
					rawOutput:
						'src/lib/agent.ts\nsrc/lib/middleware.ts\nsrc/lib/transport.ts\nsrc/lib/types.ts\nsrc/lib/utils.ts\nsrc/lib/registry.ts\nsrc/lib/errors.ts\nsrc/lib/config.ts',
				}}
			/>

			{/* Multiple rapid reads */}
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc2',
					title: 'Read src/lib/agent.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc3',
					title: 'Read src/lib/middleware.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc4',
					title: 'Read src/lib/transport.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc5',
					title: 'Read src/lib/types.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc6',
					title: 'Read src/lib/utils.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc7',
					title: 'Read src/lib/registry.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc8',
					title: 'Read src/lib/errors.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc9',
					title: 'Read src/lib/config.ts',
					kind: 'read',
					status: 'completed',
				}}
			/>

			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: "Here's an overview of `src/lib/`:\n\n- **`agent.ts`** (142 lines) — Agent spawning and lifecycle\n- **`middleware.ts`** (89 lines) — Composable middleware chain\n- **`transport.ts`** (210 lines) — Stdio JSON-RPC transport\n- **`types.ts`** (67 lines) — Shared type definitions\n- **`utils.ts`** (43 lines) — Helpers (retry, debounce, etc.)\n- **`registry.ts`** (156 lines) — Agent discovery and spec validation\n- **`errors.ts`** (38 lines) — Custom error classes\n- **`config.ts`** (72 lines) — Configuration loading and defaults",
					isStreaming: false,
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: High token usage (> 80% threshold)
// ---------------------------------------------------------------------------

export const HighTokenUsage: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Continue with the migration.',
					isStreaming: false,
				}}
			/>
			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: "I'm running low on context. Let me summarize what we've done so far and continue with the remaining steps.\n\n**Completed:**\n- Database schema split\n- RLS policies\n- TimescaleDB migration\n\n**Remaining:**\n- Full-text search indexes\n- CDC setup",
					isStreaming: false,
				}}
			/>
			<UsageBar
				usage={{
					used: 178_000,
					size: 200_000,
					cost: { amount: 0.8921, currency: '$' },
				}}
			/>
		</ConversationThread>
	),
};

// ---------------------------------------------------------------------------
// Edge: Large diff with many changes
// ---------------------------------------------------------------------------

export const LargeDiff: Story = {
	render: () => (
		<ConversationThread>
			<MessageBubble
				message={{
					id: 'u1',
					role: 'user',
					text: 'Create a new test file for the transport layer.',
					isStreaming: false,
				}}
			/>
			<ToolCallCard
				toolCall={{
					toolCallId: 'tc1',
					title: 'Create src/__tests__/transport.test.ts',
					kind: 'edit',
					status: 'completed',
					content: [
						{
							type: 'diff' as const,
							path: 'src/__tests__/transport.test.ts',
							newText: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StdioTransport } from '../lib/transport';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

describe('StdioTransport', () => {
  let transport: StdioTransport;
  let mockStdin: Readable;
  let mockStdout: Writable;
  let mockStderr: Writable;

  beforeEach(() => {
    mockStdin = new Readable({ read() {} });
    mockStdout = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    mockStderr = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    transport = new StdioTransport({
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
    });
  });

  afterEach(async () => {
    await transport.close();
  });

  describe('connection', () => {
    it('establishes connection on start', async () => {
      await transport.start();
      expect(transport.isConnected).toBe(true);
    });

    it('emits connected event', async () => {
      const handler = vi.fn();
      transport.on('connected', handler);
      await transport.start();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('throws if already connected', async () => {
      await transport.start();
      await expect(transport.start()).rejects.toThrow('Already connected');
    });
  });

  describe('messaging', () => {
    it('sends JSON-RPC message', async () => {
      const writeSpy = vi.spyOn(mockStdout, 'write');
      await transport.start();
      await transport.send({ jsonrpc: '2.0', method: 'test', id: 1 });

      const written = writeSpy.mock.calls[0]?.[0]?.toString();
      expect(JSON.parse(written!)).toEqual({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });
    });

    it('receives JSON-RPC message', async () => {
      const handler = vi.fn();
      transport.on('message', handler);
      await transport.start();

      const msg = JSON.stringify({ jsonrpc: '2.0', method: 'notify' });
      mockStdin.push(msg + '\\n');

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledWith({
          jsonrpc: '2.0',
          method: 'notify',
        });
      });
    });

    it('handles malformed JSON gracefully', async () => {
      const errorHandler = vi.fn();
      transport.on('error', errorHandler);
      await transport.start();

      mockStdin.push('not-json\\n');

      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });
    });

    it('buffers messages during backpressure', async () => {
      const slowStdout = new Writable({
        write(chunk, encoding, callback) {
          setTimeout(callback, 100);
        },
        highWaterMark: 16,
      });
      const slowTransport = new StdioTransport({
        stdin: mockStdin,
        stdout: slowStdout,
        stderr: mockStderr,
      });
      await slowTransport.start();

      // Fire multiple messages rapidly
      const promises = Array.from({ length: 10 }, (_, i) =>
        slowTransport.send({ jsonrpc: '2.0', method: 'test', id: i }),
      );

      await Promise.all(promises);
      await slowTransport.close();
    });
  });

  describe('lifecycle', () => {
    it('gracefully shuts down', async () => {
      await transport.start();
      await transport.close();
      expect(transport.isConnected).toBe(false);
    });

    it('emits disconnected event on close', async () => {
      const handler = vi.fn();
      transport.on('disconnected', handler);
      await transport.start();
      await transport.close();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('rejects pending messages on close', async () => {
      await transport.start();
      const pending = transport.send({
        jsonrpc: '2.0',
        method: 'slow',
        id: 99,
      });
      await transport.close();
      await expect(pending).rejects.toThrow('Transport closed');
    });
  });
});`,
						},
					],
				}}
			/>

			<MessageBubble
				message={{
					id: 'a1',
					role: 'assistant',
					text: 'Created a comprehensive test file with 9 tests covering connection, messaging (including backpressure and malformed input), and lifecycle management.',
					isStreaming: false,
				}}
			/>
		</ConversationThread>
	),
};
