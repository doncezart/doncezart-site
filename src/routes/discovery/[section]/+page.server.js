import { error } from '@sveltejs/kit';

const VALID_SECTIONS = {
    'curated-resources': {
        name: 'Curated Resources',
        description: 'Tools, references & articles worth bookmarking.'
    },
    'tutorials': {
        name: 'Tutorials',
        description: 'Step-by-step guides and learning material.'
    },
    'pure-art': {
        name: 'Pure Art',
        description: 'Artwork and visual inspiration, no context needed.'
    },
    'videography': {
        name: 'Videography',
        description: 'Film, motion, and cinematography work.'
    }
};

export function load({ params }) {
    const section = VALID_SECTIONS[params.section];
    if (!section) {
        error(404, `Section "${params.section}" not found`);
    }
    return { section };
}
