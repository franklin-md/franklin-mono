import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export function mcpToolName(serverId: string, remoteName: string): string {
	const identity = bytesToHex(
		sha256(new TextEncoder().encode(`${serverId}:${remoteName}`)),
	).slice(0, 16);
	const readable = remoteName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 42);
	return `mcp_${readable}_${identity}`;
}
