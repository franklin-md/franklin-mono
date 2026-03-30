// Wire types
export type { JsonRpcMessage } from './types.js';

// Binding (connecting)
export { bindClient, bindServer, type PeerBinding } from './binding/index.js';
export { JsonRpcProxyRuntime, JsonRpcServerRuntime } from './binding/index.js';
export { RpcError } from './errors.js';
