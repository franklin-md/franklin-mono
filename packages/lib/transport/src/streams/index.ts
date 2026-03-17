// Types
export type { Duplex, Observer } from './types.js';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- backwards compat re-export
export type { Stream } from './types.js';

// Readable
export { pump } from './readable/pump.js';
export { observe } from './readable/observe.js';
export { fromObserver } from './readable/from-observer.js';
export { emptyReadable } from './readable/empty.js';

// Writable
export { callable } from './writable/callable.js';
export { fromCallable } from './writable/from-callable.js';
export { emptyWritable } from './writable/empty.js';

// Duplex
export { connect } from './duplex/connect.js';
export { map } from './duplex/map.js';
export {
	bridge,
	type Bridge,
	type BridgeRequest,
	type BridgeResponse,
	type BridgeSuccessResponse,
	type BridgeErrorResponse,
} from './duplex/bridge.js';
export { emptyDuplex } from './duplex/empty.js';
export { debugStream as debug } from './duplex/debug.js';
