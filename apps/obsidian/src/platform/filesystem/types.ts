export type ObsidianPathTarget =
	| { kind: 'vault'; path: string }
	| { kind: 'backup'; path: string };
