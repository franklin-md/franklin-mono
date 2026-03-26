export { ElectronFramework } from './framework.js';
export { createIpcAgentTransport } from './ipc/agent-transport.js';
export { createIpcStream } from './ipc/stream.js';
export type { FranklinBridge } from './ipc/stream.js';
export { ElectronAuthManager, createIpcLoginOAuth } from './ipc/auth-store.js';
export type { AuthBridge } from './ipc/auth-store.js';
export { createElectronPersistence } from './persister.js';
