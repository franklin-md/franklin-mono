import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTriggerOnChange } from '../utils/use-trigger-on-change.js';

describe('useTriggerOnChange', () => {
	it('triggers when the key changes after mount', () => {
		const trigger = vi.fn();
		const { rerender } = renderHook(
			({ triggerKey }: { triggerKey: unknown }) =>
				useTriggerOnChange(triggerKey, trigger),
			{ initialProps: { triggerKey: 'a' } },
		);

		expect(trigger).not.toHaveBeenCalled();

		rerender({ triggerKey: 'b' });

		expect(trigger).toHaveBeenCalledTimes(1);
	});

	it('does not trigger when the key is unchanged', () => {
		const trigger = vi.fn();
		const { rerender } = renderHook(
			({ triggerKey }: { triggerKey: unknown }) =>
				useTriggerOnChange(triggerKey, trigger),
			{ initialProps: { triggerKey: 'a' } },
		);

		rerender({ triggerKey: 'a' });

		expect(trigger).not.toHaveBeenCalled();
	});

	it('does not trigger while disabled', () => {
		const trigger = vi.fn();
		const { rerender } = renderHook(
			({ disabled, triggerKey }: { disabled: boolean; triggerKey: unknown }) =>
				useTriggerOnChange(triggerKey, trigger, { disabled }),
			{ initialProps: { disabled: true, triggerKey: 'a' } },
		);

		expect(trigger).not.toHaveBeenCalled();

		rerender({ disabled: true, triggerKey: 'b' });

		expect(trigger).not.toHaveBeenCalled();
	});

	it('does not trigger when only disabled changes', () => {
		const trigger = vi.fn();
		const { rerender } = renderHook(
			({ disabled, triggerKey }: { disabled: boolean; triggerKey: unknown }) =>
				useTriggerOnChange(triggerKey, trigger, { disabled }),
			{ initialProps: { disabled: true, triggerKey: 'a' } },
		);

		rerender({ disabled: false, triggerKey: 'a' });

		expect(trigger).not.toHaveBeenCalled();
	});

	it('triggers on the next key change after being re-enabled', () => {
		const trigger = vi.fn();
		const { rerender } = renderHook(
			({ disabled, triggerKey }: { disabled: boolean; triggerKey: unknown }) =>
				useTriggerOnChange(triggerKey, trigger, { disabled }),
			{ initialProps: { disabled: true, triggerKey: 'a' } },
		);

		rerender({ disabled: false, triggerKey: 'a' });
		rerender({ disabled: false, triggerKey: 'b' });

		expect(trigger).toHaveBeenCalledTimes(1);
	});

	it('retrigger calls the latest trigger without changing the key', () => {
		const first = vi.fn();
		const second = vi.fn();
		const { result, rerender } = renderHook(
			({ trigger }: { trigger: () => void }) =>
				useTriggerOnChange('a', trigger),
			{ initialProps: { trigger: first } },
		);

		expect(first).not.toHaveBeenCalled();

		rerender({ trigger: second });

		act(() => {
			result.current.retrigger();
		});

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('returns a stable retrigger method', () => {
		const trigger = vi.fn();
		const { result, rerender } = renderHook(() =>
			useTriggerOnChange('a', trigger),
		);
		const retrigger = result.current.retrigger;

		rerender();

		expect(result.current.retrigger).toBe(retrigger);
	});
});
