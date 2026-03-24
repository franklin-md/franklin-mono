// IPC data bus (single bidirectional channel for all multiplexed traffic)
export const IPC_STREAM = 'ipc-stream';

// Level 1 stream names (demuxed from the shared IPC_STREAM channel)
export const AGENT_STREAM = 'agent-transport';
export const MCP_STREAM = 'mcp-transport';

// IPC invoke channels (request/response)
export const AGENT_SPAWN = 'franklin:agent:spawn';
export const AGENT_KILL = 'franklin:agent:kill';
export const MCP_START = 'franklin:mcp:start';
export const MCP_STOP = 'franklin:mcp:stop';

// Persist channels (file I/O bridged to main process)
export const PERSIST_READ_FILE = 'franklin:persist:readFile';
export const PERSIST_WRITE_FILE = 'franklin:persist:writeFile';
export const PERSIST_READ_DIR = 'franklin:persist:readDir';
export const PERSIST_DELETE_FILE = 'franklin:persist:deleteFile';
export const PERSIST_MKDIR = 'franklin:persist:mkdir';
