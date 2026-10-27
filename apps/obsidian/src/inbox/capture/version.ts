// Bump whenever the capture technique changes: research collection, card matching
// or decoding, retained evidence, or the saved episode format. This is independent
// of the internal recovery journal's schema version. Version 4 completes recordings
// automatically on Stop/switch and discards empty recordings without an episode.
export const CAPTURE_VERSION = 4;
