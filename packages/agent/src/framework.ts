/**
 * Base class for framework implementations.
 *
 * Subclasses provide environment provisioning and agent spawning.
 * Previously held `toolTransport` for MCP tool relay — that's now
 * handled by in-channel extension tools (no MCP relay needed).
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Framework {}
