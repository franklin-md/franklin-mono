import type {
	StreamObserverEvent,
	StreamObserverHandler,
} from '../../../api/handlers.js';

export type AgentStreamObservers = {
	[K in StreamObserverEvent]: StreamObserverHandler<K>[];
};
