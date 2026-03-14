// Types
export type {
	AgentCommands,
	AgentControl,
	AgentEvents,
	AgentLifecycle,
	AgentStack,
} from './types.js';

// Middleware types + buildChain
export type {
	ChainFn,
	CommandMiddleware,
	Cont,
	EventMiddleware,
	Middleware,
} from './middleware.js';
export {
	ALL_METHODS,
	COMMAND_METHODS,
	EVENT_METHODS,
	buildChain,
} from './middleware.js';

// Sequence
export { sequence, sequenceCommands, sequenceEvents } from './sequence.js';

// Compose + Connect
export { compose, connect } from './compose.js';
