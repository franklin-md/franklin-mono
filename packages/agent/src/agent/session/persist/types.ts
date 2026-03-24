import type { Sharing } from '@franklin/extensions';
import type { Message, LLMConfig } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Serializable snapshots
// ---------------------------------------------------------------------------

export type StoreSnapshot = {
	value: unknown;
	sharing: Sharing;
};

export type SessionSnapshot = {
	sessionId: string;
	systemPrompt: string;
	messages: Message[];
	config?: LLMConfig;
	stores: Record<string, StoreSnapshot>;
};

// ---------------------------------------------------------------------------
// Abstract Persister — implementations handle I/O
// ---------------------------------------------------------------------------

export interface Persister {
	save(id: string, snapshot: SessionSnapshot): Promise<void>;
	load(): Promise<SessionSnapshot[]>;
	delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// FileSystemOps — parameterized file I/O for concrete persisters
// ---------------------------------------------------------------------------

export type FileSystemOps = {
	readFile: (path: string) => Promise<string>;
	writeFile: (path: string, data: string) => Promise<void>;
	readDir: (path: string) => Promise<string[]>;
	deleteFile: (path: string) => Promise<void>;
	mkdir: (path: string) => Promise<void>;
};
