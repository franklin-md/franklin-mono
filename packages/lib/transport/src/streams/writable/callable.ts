/**
 * Gives a WritableStream a call interface.
 *
 * Acquires a writer and returns a fire-and-forget function
 * that writes values into the stream.
 */
export function callable<T>(writable: WritableStream<T>): (value: T) => void {
	const writer = writable.getWriter();
	return (value: T) => {
		void writer.write(value);
	};
}
