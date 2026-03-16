// Stream algebra
export type { Duplex, Observer } from './streams/types.js';
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

// Codecs
export { mapStream, ndjsonCodec, type Codec } from './codec/index.js';

// NDJSON
export { createNdjsonDecoder, encodeNdjsonLine } from './streams/ndjson.js';

// Transports
export { StdioPipe } from './stdio/index.js';
export type { StdioPipeOptions } from './stdio/index.js';
export { createMemoryPipes } from './in-memory/index.js';
export type { MemoryPipePair } from './in-memory/index.js';
export { HttpJsonServer } from './http/index.js';
export type { HttpServerOptions as HttpJsonServerOptions } from './http/index.js';
export { asStream as createCallbackServerPipe } from './http/stream.js';
export type {
	Response as HttpPipeResponse,
	SuccessResponse as HttpPipeSuccessResponse,
	ErrorResponse as HttpPipeErrorResponse,
} from './http/types.js';
export { PortManager, portManager } from './http/port-manager.js';

// Multiplexing
export { Multiplexer } from './multiplex/index.js';
export type { MuxPacket } from './multiplex/index.js';
