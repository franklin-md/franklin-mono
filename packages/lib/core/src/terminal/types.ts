export type TerminalInput = {
	cmd: string;
	// In milliseconds the maximum amount of time the process is allowed to run
	timeout?: number;
	//TODO: Anthropic has this, do we need it?
	// run_in_background?: boolean,
};

export type TerminalOutput = {
	exit_code: number;
	stderr: string;
	stdout: string;
};

export interface Terminal {
	exec(input: TerminalInput): Promise<TerminalOutput>;
}
