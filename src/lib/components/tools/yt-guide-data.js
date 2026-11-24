// Text shared by the YouTube Card Generator guide and the page's structured
// data (HowTo + FAQPage), so both always say the same thing.

// Paste the tutorial's YouTube id here (e.g. 'dQw4w9WgXcQ') and the
// placeholder becomes the embedded video.
export const TUTORIAL_ID = '';

export const STEPS = [
    { name: 'Paste a YouTube link', text: 'Any video, Short or live stream. Title, thumbnail, channel and stats fill in by themselves.' },
    { name: 'Pick a layout', text: 'Eight layouts, each a faithful copy of a real YouTube element, from the home feed to the watch page.' },
    { name: 'Choose what it shows', text: 'Switch parts on or off in Content, then set the theme, font and text size in Style.' },
    { name: 'Size it on your frame', text: 'Pick your video resolution. The card starts at 50% of the width; drag it, resize it from any edge or corner, and it snaps to the edges and centre.' },
    { name: 'Download and drop it in', text: 'PNG or WebP with transparent corners, at exactly the planned size. Place it at 100% in your editor.' }
];

export const FAQ = [
    ['Is it free?', 'Yes. The tool and the API are free, need no account and add no watermark.'],
    ['Can I use the cards in my videos?', 'Yes, that’s what they’re for: showing a video you mention, recommend or react to. The thumbnail and title still belong to their creator, so use the card to reference or credit the video.'],
    ['What size should the card be?', 'Half the frame width (50%) is the default and reads well on any screen. Go smaller (25–35%) for a corner overlay, or bigger (75%) when the card is the focus.'],
    ['What exactly do I download?', 'Just the card: no shadow, and transparent corners in PNG and WebP, so you add your own shadow or animation in the editor. JPEG can’t be transparent, so its corners are white.'],
    ['Why are views, duration or the avatar missing?', 'Those come from YouTube’s data API. If it doesn’t answer, the card still gets the title and thumbnail. Try again a bit later.'],
    ['Is my data stored?', 'Cards are drawn in your browser. We count which videos become cards to improve the tool, without storing your IP address (only an anonymous code that can’t be turned back into it).']
];
