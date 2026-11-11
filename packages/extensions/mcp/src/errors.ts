import { SdkError, SdkErrorCode } from '@modelcontextprotocol/client';

export class MCPConnectionError extends Error {}

export function connectionErrorMessage(error: unknown): string {
	if (error instanceof MCPConnectionError) return error.message;
	if (error instanceof SdkError) {
		if (error.code === SdkErrorCode.RequestTimeout)
			return 'MCP request timed out. A submitted research job may still be running; continue its known run ID rather than starting it again.';
		if (error.code === SdkErrorCode.InvalidResult)
			return 'The server returned an invalid MCP result.';
	}
	return 'MCP request failed. Check the connection, credentials and tool access, then retry. A submitted research job may still be running.';
}
