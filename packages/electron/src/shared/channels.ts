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

// Auth — invoke channels (renderer → main)
export const AUTH_GET_PROVIDERS = 'franklin:auth:getProviders';
export const AUTH_GET_CANONICAL_PROVIDERS = 'franklin:auth:getCanonicalProviders';
export const AUTH_LOAD = 'franklin:auth:load';
export const AUTH_SET_ENTRY = 'franklin:auth:setEntry';
export const AUTH_REMOVE_ENTRY = 'franklin:auth:removeEntry';
export const AUTH_START_LOGIN = 'franklin:auth:startLogin';
export const AUTH_OPEN_EXTERNAL = 'franklin:auth:openExternal';

// Auth — one-way send (renderer → main)
export const AUTH_PROMPT_RESPONSE = 'franklin:auth:promptResponse';

// Auth — main → renderer push events (within an active OAuth flow)
export const AUTH_OAUTH_ON_AUTH = 'franklin:auth:oauth:onAuth';
export const AUTH_OAUTH_ON_PROGRESS = 'franklin:auth:oauth:onProgress';
export const AUTH_OAUTH_ON_PROMPT = 'franklin:auth:oauth:onPrompt';
