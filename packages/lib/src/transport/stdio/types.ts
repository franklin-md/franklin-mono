export interface StdioPipeOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
}
