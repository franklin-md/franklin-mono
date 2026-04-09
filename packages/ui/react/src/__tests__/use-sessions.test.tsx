// describe('useSessions', () => {
// 	it('reuses the previous snapshot when the ordered session list is unchanged', () => {
// 		const manager = new FakeSessionManager([makeSession('a')]);
// 		const renderCount = { value: 0 };
// 		const wrapper = makeWrapper(manager);

// 		const { result } = renderHook(
// 			() => {
// 				renderCount.value++;
// 				return useSessions();
// 			},
// 			{ wrapper },
// 		);

// 		const firstSnapshot = result.current;
// 		const before = renderCount.value;

// 		act(() => {
// 			manager.emit();
// 		});

// 		expect(renderCount.value).toBe(before);
// 		expect(result.current).toBe(firstSnapshot);
// 	});

// 	it('publishes a new snapshot when the ordered session list changes', () => {
// 		const manager = new FakeSessionManager([makeSession('a')]);
// 		const wrapper = makeWrapper(manager);
// 		const { result } = renderHook(() => useSessions(), { wrapper });

// 		const firstSnapshot = result.current;

// 		act(() => {
// 			manager.push(makeSession('b'));
// 		});

// 		expect(result.current).not.toBe(firstSnapshot);
// 		expect(result.current.map((session) => session.session.id)).toEqual([
// 			'a',
// 			'b',
// 		]);
// 	});
// });
