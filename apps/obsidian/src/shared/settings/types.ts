export type SettingsUpdate<T> = Partial<T> | ((current: T) => Partial<T>);

// Settings change only after their file is written, so the value always
// matches disk. It is a ReadonlyStore whose functions are bound properties
// rather than methods, so they can be passed on directly, such as
// useSyncExternalStore(settings.subscribe, settings.get) or
// onChange={settings.configure}.
export type SettingsFile<T> = {
	get: () => T;
	subscribe: (listener: (value: T) => void) => () => void;
	// Queued updates apply in order, each to the latest saved value. A failed
	// write rejects and leaves the value unchanged.
	configure: (update: SettingsUpdate<T>) => Promise<void>;
	// Refuses new updates and waits for accepted ones to finish writing.
	dispose: () => Promise<void>;
};
