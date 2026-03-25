// IPC data bus (single bidirectional channel for all multiplexed traffic)
export const IPC_STREAM = 'ipc-stream';

// Level 1 stream names (demuxed from the shared IPC_STREAM channel)
export const AGENT_STREAM = 'agent-transport';

// IPC invoke channels (request/response)
export const AGENT_SPAWN = 'franklin:agent:spawn';
export const AGENT_KILL = 'franklin:agent:kill';
export const APP_GET_STORAGE = 'franklin:app:getStorage';

// Filesystem channels (file I/O bridged to main process)
export const FILESYSTEM_READ_FILE = 'franklin:filesystem:readFile';
export const FILESYSTEM_WRITE_FILE = 'franklin:filesystem:writeFile';
export const FILESYSTEM_READ_DIR = 'franklin:filesystem:readDir';
export const FILESYSTEM_DELETE_FILE = 'franklin:filesystem:deleteFile';
export const FILESYSTEM_MKDIR = 'franklin:filesystem:mkdir';
export const FILESYSTEM_ACCESS = 'franklin:filesystem:access';
export const FILESYSTEM_STAT = 'franklin:filesystem:stat';
export const FILESYSTEM_EXISTS = 'franklin:filesystem:exists';
export const FILESYSTEM_GLOB = 'franklin:filesystem:glob';
