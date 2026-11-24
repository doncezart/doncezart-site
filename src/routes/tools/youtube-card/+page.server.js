import { fetchYouTubeVideoInfo } from '$lib/server/youtube.js';

// A real video so the editor is usable the moment the page opens. The
// YouTube lookup is cached server-side (30 min), so this costs almost no
// API quota, and it isn't logged as a generation. Streamed: the page renders
// immediately and the card fills in when the lookup resolves.
const DEMO_URL = 'https://youtu.be/aqz-KE-bpKQ';

export function load() {
    return {
        demo: fetchYouTubeVideoInfo(DEMO_URL)
            .then((v) => ({ ...v, demo: true }))
            .catch(() => null)
    };
}
