import type {
	Duplex,
	JsonRpcRequest,
	JsonRpcResponse,
} from '@franklin/transport';
import type { CancelParams, PromptParams } from './types.js';
import type { ToolCall, ToolResult } from '../types/tool.js';

// From User ->Agent
type UpstreamRequests =
	| JsonRpcRequest<PromptParams, 'prompt'>
	| JsonRpcRequest<CancelParams, 'cancel'>;
type UpstreamResponses = JsonRpcResponse<ToolResult>;

type UpstreamType = UpstreamRequests | UpstreamResponses;

// From Agent -> User
type DownstreamRequests = JsonRpcRequest<ToolCall, 'toolExecute'>;
type DownstreamResponses = JsonRpcResponse<ToolResult>;

type DownstreamType = DownstreamRequests | DownstreamResponses;

export type PiCPProtocol = Duplex<UpstreamType, DownstreamType>;
