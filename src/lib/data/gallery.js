const CDN = 'https://doncezart.nyc3.cdn.digitaloceanspaces.com/previews';
const CDN2 = 'https://cdn.doncez.art/previews';

export const categories = [
    { id: 'all', label: 'All' },
    { id: 'social-media', label: 'Social Media' },
    { id: 'website-design', label: 'Website Design' },
    { id: 'logo-design', label: 'Logo Design' },
    { id: 'branding', label: 'Branding' },
];

export const subcategories = {
    'all': [
        { id: 'all', label: 'All' },
    ],
    'social-media': [
        { id: 'all', label: 'All' },
        { id: 'thumbnails', label: 'Thumbnails' },
        { id: 'gaming', label: 'Gaming' },
        { id: 'templates', label: 'Templates' },
    ],
    'website-design': [
        { id: 'all', label: 'All' },
        { id: 'legal', label: 'Legal' },
        { id: 'tech', label: 'Tech' },
        { id: 'art', label: 'Art' },
    ],
    'logo-design': [
        { id: 'all', label: 'All' },
    ],
    'branding': [
        { id: 'all', label: 'All' },
        { id: 'case-studies', label: 'Case Studies' },
    ],
};

export const galleryItems = [
    // Social Media > Thumbnails (Custom CPA)
    { src: `${CDN}/custom-cpa-001.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-002.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-003.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-004.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-005.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-006.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },
    { src: `${CDN}/custom-cpa-007.webp`, alt: 'Custom CPA Thumbnail', category: 'social-media', subcategory: 'thumbnails' },

    // Social Media > Gaming
    { src: `${CDN}/custom-gaming-001.webp`, alt: 'Gaming Thumbnail', category: 'social-media', subcategory: 'gaming' },
    { src: `${CDN}/custom-gaming-002.webp`, alt: 'Gaming Thumbnail', category: 'social-media', subcategory: 'gaming' },
    { src: `${CDN}/custom-gaming-003.webp`, alt: 'Gaming Thumbnail', category: 'social-media', subcategory: 'gaming' },
    { src: `${CDN}/custom-gaming-004.webp`, alt: 'Gaming Thumbnail', category: 'social-media', subcategory: 'gaming' },
    { src: `${CDN}/custom-gaming-005.webp`, alt: 'Gaming Thumbnail', category: 'social-media', subcategory: 'gaming' },

    // Social Media > Templates
    { src: `${CDN}/template-cpa-001.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-002.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-003.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-004.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-005.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-006.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-007.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-008.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-009.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-010.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-011.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-012.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-013.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-014.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-015.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },
    { src: `${CDN}/template-cpa-016.webp`, alt: 'Template Thumbnail', category: 'social-media', subcategory: 'templates' },

    // Logo Design
    { src: `${CDN}/logo-001.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-002.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-003.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-004.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-005.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-006.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-007.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },
    { src: `${CDN}/logo-008.webp`, alt: 'Logo Design', category: 'logo-design', subcategory: 'all' },

    // Branding > Case Studies
    { src: `${CDN2}/case-study_001.webp`, alt: 'DONCEZART Case Study', category: 'branding', subcategory: 'case-studies' },
    { src: `${CDN2}/case-study_002.webp`, alt: 'PIM Case Study', category: 'branding', subcategory: 'case-studies' },
    { src: `${CDN2}/case-study_003.webp`, alt: 'Merotika Case Study', category: 'branding', subcategory: 'case-studies' },
    { src: `${CDN2}/case-study_004.webp`, alt: 'The Social Boost Hub Case Study', category: 'branding', subcategory: 'case-studies' },
];
