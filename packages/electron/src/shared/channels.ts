// IPC data bus (single bidirectional channel for all multiplexed traffic)
export const IPC_STREAM = 'ipc-stream';

// Level 1 stream names (demuxed from the shared IPC_STREAM channel)
export const AGENT_STREAM = 'agent-transport';
export const MCP_STREAM = 'mcp-transport';

// IPC invoke channels (request/response)
export const ENV_PROVISION = 'franklin:env:provision';
export const ENV_DISPOSE = 'franklin:env:dispose';
export const AGENT_SPAWN = 'franklin:agent:spawn';
export const AGENT_KILL = 'franklin:agent:kill';
export const MCP_START = 'franklin:mcp:start';
export const MCP_STOP = 'franklin:mcp:stop';
