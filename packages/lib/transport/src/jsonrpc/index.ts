// Protocol definition
export type { Protocol, ServerOf, ClientOf } from './protocol/index.js';

// Manifest definition
export type { ProtocolManifest } from './protocol/index.js';
export {
	defineManifest,
	request,
	notification,
	event,
} from './protocol/index.js';

// Binding (connecting)
export { bindClient, bindServer, type PeerBinding } from './binding/index.js';
export { RpcError } from './errors.js';
