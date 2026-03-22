import type { Protocol } from '@franklin/transport';
import type { TurnClient, TurnAgent } from './types.js';

export type PiCPProtocol = Protocol<TurnClient, TurnAgent>;
