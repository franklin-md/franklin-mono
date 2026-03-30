/**
 * Core entrypoint for @franklin/transport.
 *
 * Contains only browser-safe APIs with zero Node.js transitive dependencies.
 * The full barrel (index.ts) re-exports core plus Node-only transports.
 */

// Stream algebra
export type {
	Duplex,
	ReadType,
	WriteType,
	Middleware,
	Observer,
} from './streams/types.js';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- backwards compat re-export
export type { Stream } from './streams/types.js';
export { pump } from './streams/readable/pump.js';
export { observe } from './streams/readable/observe.js';
export { fromObserver } from './streams/readable/from-observer.js';
export { emptyReadable } from './streams/readable/empty.js';
export { callable } from './streams/writable/callable.js';
export { fromCallable } from './streams/writable/from-callable.js';
export { emptyWritable } from './streams/writable/empty.js';
export { connect } from './streams/duplex/connect.js';
export { map } from './streams/duplex/map.js';
export {
	bridge,
	type Bridge,
	type BridgeRequest,
	type BridgeResponse,
	type BridgeSuccessResponse,
	type BridgeErrorResponse,
} from './streams/duplex/bridge.js';
export { serve } from './streams/duplex/serve.js';
export { emptyDuplex } from './streams/duplex/empty.js';
export { debugStream } from './streams/duplex/debug.js';
export {
	intercept,
	type InterceptHandlers,
	type Handler,
} from './streams/duplex/intercept.js';

// Codecs
export { mapStream, ndjsonCodec, type Codec } from './codec/index.js';

// NDJSON
export { createNdjsonDecoder, encodeNdjsonLine } from './streams/ndjson.js';

// In-memory (no Node deps)
export { createMemoryStream, createDuplexPair } from './in-memory/index.js';

// Multiplexing
export { Multiplexer } from './multiplex/index.js';
export type { MuxPacket } from './multiplex/index.js';

// JSON-RPC
export {
	RpcError,
	bindClient,
	bindServer,
	JsonRpcProxyRuntime,
	JsonRpcServerRuntime,
	type JsonRpcMessage,
	type PeerBinding,
} from './jsonrpc/index.js';

// Config types (browser-safe — pure interfaces, no Node runtime deps)
export type { StdioPipeOptions } from './stdio/types.js';
