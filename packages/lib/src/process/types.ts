export type ProcessInput = {
	file: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	// In milliseconds the maximum amount of time the process is allowed to run
	timeout?: number;
};

export type ProcessOutput = {
	exit_code: number;
	stderr: string;
	stdout: string;
};

export interface Process {
	exec(input: ProcessInput): Promise<ProcessOutput>;
}
