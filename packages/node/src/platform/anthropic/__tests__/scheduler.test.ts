import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProcessOutput } from '@franklin/lib';
import type { ExecutionResult } from '../executor/types.js';
import { SandboxScheduler } from '../scheduler/index.js';
import type { SandboxTask } from '../scheduler/types.js';
import { execute } from '../executor/index.js';

vi.mock('../executor/index.js', () => ({ execute: vi.fn() }));

const commandOutput: ProcessOutput = {
	exit_code: 0,
	stdout: 'done',
	stderr: '',
};
const output: ExecutionResult = {
	outcome: { status: 'fulfilled', value: commandOutput },
	runtime: 'reusable',
};
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function task(name: string, domain = 'a.example'): SandboxTask {
	return {
		input: { file: name, args: ['original'], env: { VALUE: 'original' } },
		config: {
			network: { allowedDomains: [domain], deniedDomains: [] },
			filesystem: {
				allowRead: [],
				allowWrite: [],
				denyWrite: [],
				denyRead: [],
			},
		},
	};
}
function setup() {
	const work = new Map<string, ReturnType<typeof deferred<ExecutionResult>>>();
	const execution = vi.mocked(execute).mockImplementation((input) => {
		const completion = deferred<ExecutionResult>();
		work.set(input.file, completion);
		return completion.promise;
	});
	const switchConfig = vi.fn(async () => {});
	const reset = vi.fn(async () => {});
	const scheduler = new SandboxScheduler({
		switchConfig,
		reset,
	});
	return { scheduler, execute: execution, switchConfig, reset, work };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const started = (runtime: ReturnType<typeof setup>) =>
	runtime.execute.mock.calls.map(([input]) => input.file);

beforeEach(() => vi.resetAllMocks());

describe('sandbox scheduler', () => {
	it('overlaps filesystem profiles and keeps matching idle configuration warm', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		const differentFiles = task('second');
		differentFiles.config.filesystem.allowWrite = ['/second'];
		const second = runtime.scheduler.schedule(differentFiles);
		await flush();
		expect(started(runtime)).toEqual(['first', 'second']);
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
		runtime.work.get('second')!.resolve(output);
		await second;
		runtime.work.get('first')!.resolve(output);
		await first;
		const third = runtime.scheduler.schedule(task('third'));
		await flush();
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
		runtime.work.get('third')!.resolve(output);
		await third;
		expect(runtime.reset).not.toHaveBeenCalled();
	});

	it('queues behind switching and resolves only after execution completes', async () => {
		const runtime = setup();
		const switching = deferred<undefined>();
		runtime.switchConfig.mockReturnValueOnce(switching.promise);
		const settled = vi.fn();
		const first = runtime.scheduler.schedule(task('first')).then(settled);
		const second = runtime.scheduler.schedule(task('second', 'b.example'));
		await flush();
		expect(started(runtime)).toEqual([]);
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
		switching.resolve(undefined);
		await flush();
		expect(started(runtime)).toEqual(['first']);
		expect(settled).not.toHaveBeenCalled();
		runtime.work.get('first')!.resolve(output);
		await first;
		await flush();
		expect(started(runtime)).toEqual(['first', 'second']);
		runtime.work.get('second')!.resolve(output);
		await second;
	});

	it('does not bypass the oldest incompatible request', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		await flush();
		const second = runtime.scheduler.schedule(task('second', 'b.example'));
		const third = runtime.scheduler.schedule(task('third'));
		await flush();
		expect(started(runtime)).toEqual(['first']);
		runtime.work.get('first')!.resolve(output);
		await first;
		await flush();
		expect(started(runtime)).toEqual(['first', 'second']);
		runtime.work.get('second')!.resolve(output);
		await second;
		await flush();
		expect(started(runtime)).toEqual(['first', 'second', 'third']);
		runtime.work.get('third')!.resolve(output);
		await third;
	});

	it('waits for every active command before switching and admitting later work', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		const overlapping = runtime.scheduler.schedule(task('overlapping'));
		await flush();
		expect(started(runtime)).toEqual(['first', 'overlapping']);
		const waiting = runtime.scheduler.schedule(task('waiting', 'b.example'));
		const late = runtime.scheduler.schedule(task('late'));
		runtime.work.get('first')!.resolve(output);
		await first;
		await flush();
		expect(started(runtime)).toEqual(['first', 'overlapping']);
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
		runtime.work.get('overlapping')!.resolve(output);
		await overlapping;
		await flush();
		expect(started(runtime)).toEqual(['first', 'overlapping', 'waiting']);
		runtime.work.get('waiting')!.resolve(output);
		await waiting;
		await flush();
		expect(started(runtime)).toEqual([
			'first',
			'overlapping',
			'waiting',
			'late',
		]);
		runtime.work.get('late')!.resolve(output);
		await late;
	});

	it('snapshots queued arguments, environment and explicit filesystem lists', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		await flush();
		const original = task('queued', 'b.example');
		const queued = runtime.scheduler.schedule(original);
		original.input.args!.push('changed');
		original.input.env!.VALUE = 'changed';
		original.config.network.allowedDomains.push('changed');
		original.config.filesystem.allowWrite.push('/changed');
		original.config.filesystem.allowRead.push('/changed');
		runtime.work.get('first')!.resolve(output);
		await first;
		await flush();
		const [input, config] = runtime.execute.mock.calls[1]!;
		expect(input).toEqual(task('queued').input);
		expect(config.network.allowedDomains).toEqual(['b.example']);
		expect(config.filesystem.allowWrite).toEqual([]);
		expect(config.filesystem.allowRead).toEqual([]);
		runtime.work.get('queued')!.resolve(output);
		await queued;
	});

	it('does not treat shared filesystem flags as per-command overrides', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		await flush();
		const changed = task('changed');
		changed.config.filesystem.allowGitConfig = true;
		const second = runtime.scheduler.schedule(changed);
		await flush();
		expect(started(runtime)).toEqual(['first']);
		runtime.work.get('first')!.resolve(output);
		await first;
		await flush();
		expect(runtime.switchConfig).toHaveBeenCalledTimes(2);
		runtime.work.get('changed')!.resolve(output);
		await second;
	});

	it('releases failed execution and continues queued work', async () => {
		const runtime = setup();
		const first = runtime.scheduler.schedule(task('first'));
		const outcome = Promise.allSettled([first]);
		await flush();
		const next = runtime.scheduler.schedule(task('next', 'b.example'));
		runtime.work.get('first')!.resolve({
			outcome: { status: 'rejected', reason: new Error('execution failed') },
			runtime: 'reusable',
		});
		expect(await outcome).toMatchObject([
			{ status: 'rejected', reason: { message: 'execution failed' } },
		]);
		await flush();
		expect(started(runtime)).toEqual(['first', 'next']);
		runtime.work.get('next')!.resolve(output);
		await next;
	});

	it.each([false, true])(
		'drains before recovery and blocks admission until reset completes (policy waiting: %s)',
		async (policyWaiting) => {
			const runtime = setup();
			const reset = deferred<undefined>();
			runtime.reset.mockReturnValueOnce(reset.promise);
			const first = runtime.scheduler.schedule(task('first'));
			const firstOutcome = Promise.allSettled([first]);
			const active = runtime.scheduler.schedule(task('active'));
			await flush();
			const waiting = policyWaiting
				? runtime.scheduler.schedule(task('waiting', 'b.example'))
				: undefined;
			runtime.work.get('first')!.resolve({
				outcome: { status: 'rejected', reason: new Error('cleanup failed') },
				runtime: 'needs-reset',
			});
			expect(await firstOutcome).toMatchObject([
				{ status: 'rejected', reason: { message: 'cleanup failed' } },
			]);
			const late = runtime.scheduler.schedule(task('late'));
			await flush();
			expect(started(runtime)).toEqual(['first', 'active']);
			expect(runtime.reset).not.toHaveBeenCalled();
			runtime.work.get('active')!.resolve(output);
			await active;
			await flush();
			expect(runtime.reset).toHaveBeenCalledOnce();
			const duringReset = runtime.scheduler.schedule(task('during-reset'));
			await flush();
			expect(started(runtime)).toEqual(['first', 'active']);
			reset.resolve(undefined);
			await flush();
			expect(runtime.switchConfig).toHaveBeenNthCalledWith(
				2,
				undefined,
				task('next', policyWaiting ? 'b.example' : 'a.example').config,
			);
			expect(started(runtime)).toEqual(
				policyWaiting
					? ['first', 'active', 'waiting']
					: ['first', 'active', 'late', 'during-reset'],
			);
			if (waiting) {
				runtime.work.get('waiting')!.resolve(output);
				await waiting;
				await flush();
			}
			expect(started(runtime).slice(-2)).toEqual(['late', 'during-reset']);
			runtime.work.get('late')!.resolve(output);
			runtime.work.get('during-reset')!.resolve(output);
			await Promise.all([late, duringReset]);
		},
	);

	it('rejects queued and future work if recovery after cleanup failure fails', async () => {
		const runtime = setup();
		runtime.reset.mockRejectedValueOnce(new Error('reset failed'));
		const first = runtime.scheduler.schedule(task('first'));
		await flush();
		const waiting = runtime.scheduler.schedule(task('waiting', 'b.example'));
		const results = Promise.allSettled([first, waiting]);
		runtime.work.get('first')!.resolve({
			outcome: { status: 'rejected', reason: new Error('cleanup failed') },
			runtime: 'needs-reset',
		});
		expect(await results).toMatchObject([
			{ status: 'rejected', reason: { message: 'cleanup failed' } },
			{
				status: 'rejected',
				reason: {
					errors: [{ message: 'cleanup failed' }, { message: 'reset failed' }],
				},
			},
		]);
		await expect(runtime.scheduler.schedule(task('future'))).rejects.toThrow(
			'recovery failed',
		);
		expect(started(runtime)).toEqual(['first']);
	});

	it('recovers a failed switch before trying the next queued request', async () => {
		const runtime = setup();
		const recovery = deferred<undefined>();
		runtime.switchConfig.mockRejectedValueOnce(new Error('switch failed'));
		runtime.reset.mockReturnValueOnce(recovery.promise);
		const first = runtime.scheduler.schedule(task('first'));
		const outcome = Promise.allSettled([first]);
		const next = runtime.scheduler.schedule(task('next'));
		await flush();
		expect(started(runtime)).toEqual([]);
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
		recovery.resolve(undefined);
		expect(await outcome).toMatchObject([
			{ status: 'rejected', reason: { message: 'switch failed' } },
		]);
		await flush();
		expect(started(runtime)).toEqual(['next']);
		runtime.work.get('next')!.resolve(output);
		await next;
	});

	it('rejects queued and future requests when recovery fails', async () => {
		const runtime = setup();
		runtime.switchConfig.mockRejectedValueOnce(new Error('switch failed'));
		runtime.reset.mockRejectedValueOnce(new Error('reset failed'));
		const results = await Promise.allSettled([
			runtime.scheduler.schedule(task('first')),
			runtime.scheduler.schedule(task('second')),
		]);
		for (const result of results) {
			expect(result).toMatchObject({
				status: 'rejected',
				reason: {
					errors: [
						expect.objectContaining({ message: 'switch failed' }),
						expect.objectContaining({ message: 'reset failed' }),
					],
				},
			});
		}
		await expect(runtime.scheduler.schedule(task('later'))).rejects.toThrow(
			'recovery failed',
		);
		expect(started(runtime)).toEqual([]);
		expect(runtime.switchConfig).toHaveBeenCalledOnce();
	});
});
