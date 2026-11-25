/**
 * Fontify - Pre-bundled Catalog Snapshot
 * Curated offline-first catalog featuring:
 * 1. Curated top Google Fonts families across Sans Serif, Serif, Monospace, Display, and Handwriting
 * 2. zFont Emojis (linking existing EMOJI_CATALOG from src/ui/emojiCatalog.ts)
 *
 * All zFont font entries have been removed from BUNDLED_CATALOG.
 */

import type { BrowseItem, FontVariant } from './types';
import { EMOJI_CATALOG } from '../ui/emojiCatalog';
import { getGoogleVariableFontUrl } from './variableFonts';
import { getWeightLabel } from '../font/variants';

// Helper to construct Fontsource CDN URL for Google Fonts
function fontsourceUrl(familySlug: string, weight: number): string {
  return `https://cdn.jsdelivr.net/fontsource/fonts/${familySlug}@latest/latin-${weight}-normal.ttf`;
}

// Helper to construct weight variant label
function weightName(weight: number): string {
  return `${getWeightLabel(weight)} ${weight}`;
}

// Helper to construct offline SVG specimen thumbnail data URI (URL-encoded to prevent attribute corruption)
function svgThumbnail(family: string, category: string): string {
  const safeFamily = family.replace(/'/g, '&#39;');
  const safeCat = category.replace(/'/g, '&#39;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='70' viewBox='0 0 300 70'><rect width='100%' height='100%' fill='%231e1f22' rx='8'/><text x='16' y='42' fill='%23e3e3e3' font-family='sans-serif' font-size='22' font-weight='500'>${safeFamily}</text><text x='16' y='58' fill='%238e9196' font-family='sans-serif' font-size='10'>${safeCat}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface GoogleFontDefinition {
  name: string;
  slug: string;
  category: 'Sans Serif' | 'Serif' | 'Monospace' | 'Display' | 'Handwriting';
  author: string;
  isVariable: boolean;
  variableAxes?: string[];
  variableUrl?: string;
  weights: number[];
  previewText: string;
  description: string;
  tags: string[];
  sizeMb?: string;
}

export const GOOGLE_FONT_DEFINITIONS: GoogleFontDefinition[] = [
  {
    "name": "Inter",
    "slug": "inter",
    "category": "Sans Serif",
    "author": "Rasmus Andersson",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Almost before we knew it, we had left the ground.",
    "description": "A variable font family designed specifically for computer screens with tall x-height.",
    "tags": [
      "modern",
      "ui",
      "neutral"
    ]
  },
  {
    "name": "Roboto",
    "slug": "roboto",
    "category": "Sans Serif",
    "author": "Christian Robertson",
    "isVariable": false,
    "weights": [
      100,
      300,
      400,
      500,
      700,
      900
    ],
    "previewText": "Sphinx of black quartz, judge my vow.",
    "description": "The iconic Android system font featuring mechanical skeleton and open curves.",
    "tags": [
      "android",
      "system",
      "grotesque"
    ]
  },
  {
    "name": "Open Sans",
    "slug": "open-sans",
    "category": "Sans Serif",
    "author": "Steve Matteson",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Optimized for print, web, and mobile interfaces.",
    "description": "Humanist sans serif typeface with open forms and a neutral, friendly appearance.",
    "tags": [
      "humanist",
      "legible",
      "friendly"
    ]
  },
  {
    "name": "Lato",
    "slug": "lato",
    "category": "Sans Serif",
    "author": "Łukasz Dziedzic",
    "isVariable": false,
    "weights": [
      100,
      300,
      400,
      700,
      900
    ],
    "previewText": "Warm curves and stable classical proportions.",
    "description": "Semi-rounded details give Lato warmth, while the strong structure provides stability.",
    "tags": [
      "polish",
      "warm",
      "corporate"
    ]
  },
  {
    "name": "Montserrat",
    "slug": "montserrat",
    "category": "Sans Serif",
    "author": "Julieta Ulanovsky",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "The quick brown fox jumps over the lazy dog.",
    "description": "Inspired by traditional posters and signage in the Montserrat neighborhood of Buenos Aires.",
    "tags": [
      "geometric",
      "urban",
      "buenos-aires"
    ]
  },
  {
    "name": "Poppins",
    "slug": "poppins",
    "category": "Sans Serif",
    "author": "Indian Type Foundry",
    "isVariable": false,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Bright vixens jump; dozy fowl quack.",
    "description": "Geometric sans-serif typeface designed with pure circles and minimal ornamentation.",
    "tags": [
      "geometric",
      "friendly",
      "round"
    ]
  },
  {
    "name": "Nunito",
    "slug": "nunito",
    "category": "Sans Serif",
    "author": "Vernon Adams",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Rounded terminal sans-serif with friendly warmth.",
    "description": "Well-balanced rounded terminal sans serif family designed for display and body text.",
    "tags": [
      "rounded",
      "soft",
      "friendly"
    ]
  },
  {
    "name": "Nunito Sans",
    "slug": "nunito-sans",
    "category": "Sans Serif",
    "author": "Vernon Adams, Jacques Le Bailly",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Straight terminal variation of Nunito for clean UI.",
    "description": "Clean neo-grotesque version of Nunito with straight terminal strokes.",
    "tags": [
      "clean",
      "ui",
      "modern"
    ]
  },
  {
    "name": "Raleway",
    "slug": "raleway",
    "category": "Sans Serif",
    "author": "Matt McInerney, Pablo Impallari",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Elegant neo-grotesque with distinct crossed W.",
    "description": "Elegant sans-serif typeface family intended for headings and large-scale usage.",
    "tags": [
      "elegant",
      "thin",
      "display"
    ]
  },
  {
    "name": "Work Sans",
    "slug": "work-sans",
    "category": "Sans Serif",
    "author": "Wei Huang",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Early grotesque heritage tuned for screens and prints.",
    "description": "Based loosely on early grotesques with quirks suitable for screen reading.",
    "tags": [
      "grotesque",
      "work",
      "screens"
    ]
  },
  {
    "name": "Plus Jakarta Sans",
    "slug": "plus-jakarta-sans",
    "category": "Sans Serif",
    "author": "Gumpita Rahayu",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Modern geometric exploration for clean tech branding.",
    "description": "Contemporary typography with fresh geometric quirks crafted for modern tech interfaces.",
    "tags": [
      "tech",
      "branding",
      "geometric"
    ]
  },
  {
    "name": "DM Sans",
    "slug": "dm-sans",
    "category": "Sans Serif",
    "author": "Colophon Foundry",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Low-contrast geometric sans for high-density UI.",
    "description": "Low-contrast geometric sans-serif designed for high legibility at smaller text sizes.",
    "tags": [
      "ui",
      "low-contrast",
      "compact"
    ]
  },
  {
    "name": "Rubik",
    "slug": "rubik",
    "category": "Sans Serif",
    "author": "Hubert and Fischer",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Slightly rounded corners for playful authority.",
    "description": "A sans serif typeface with slightly rounded corners designed for the Rubik Cube Exhibition.",
    "tags": [
      "rounded",
      "hebrew",
      "game"
    ]
  },
  {
    "name": "Source Sans 3",
    "slug": "source-sans-3",
    "category": "Sans Serif",
    "author": "Paul D. Hunt",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Adobe open-source workhorse for long body text.",
    "description": "Adobe first open-source typeface family, designed specifically for user interfaces.",
    "tags": [
      "adobe",
      "workhorse",
      "text"
    ]
  },
  {
    "name": "Ubuntu",
    "slug": "ubuntu",
    "category": "Sans Serif",
    "author": "Dalton Maag",
    "isVariable": false,
    "weights": [
      300,
      400,
      500,
      700
    ],
    "previewText": "Contemporary humanist sans designed for Linux desktop.",
    "description": "Contemporary humanist font family developed for the Ubuntu desktop operating system.",
    "tags": [
      "linux",
      "canonical",
      "humanist"
    ]
  },
  {
    "name": "Oswald",
    "slug": "oswald",
    "category": "Sans Serif",
    "author": "Vernon Adams",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Reworking of classic Alternate Gothic condensed style.",
    "description": "A rework of the classic style historically represented by Alternate Gothic typefaces.",
    "tags": [
      "condensed",
      "headline",
      "impact"
    ]
  },
  {
    "name": "Quicksand",
    "slug": "quicksand",
    "category": "Sans Serif",
    "author": "Andrew Paglinawan",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Display sans with geometric rounded terminal shapes.",
    "description": "Display sans serif with rounded terminals based on clean geometric foundations.",
    "tags": [
      "rounded",
      "friendly",
      "playful"
    ]
  },
  {
    "name": "Barlow",
    "slug": "barlow",
    "category": "Sans Serif",
    "author": "Jeremy Tribby",
    "isVariable": false,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Low-contrast grotesk drawn from California transit signs.",
    "description": "Slightly rounded, low-contrast grotesk inspired by the visual style of the California highway.",
    "tags": [
      "california",
      "transit",
      "grotesk"
    ]
  },
  {
    "name": "Manrope",
    "slug": "manrope",
    "category": "Sans Serif",
    "author": "Mikhail Sharanda",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Open-source modern crossover between DIN and Grotesque.",
    "description": "Modern geometric sans serif font combining elements of DIN, Neo-grotesque, and geometric forms.",
    "tags": [
      "din",
      "crossover",
      "modern"
    ]
  },
  {
    "name": "Heebo",
    "slug": "heebo",
    "category": "Sans Serif",
    "author": "Oded Ezer",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Hebrew and Latin sans extension based on Roboto.",
    "description": "Hebrew and Latin typeface family that extends Christian Robertson Roboto.",
    "tags": [
      "hebrew",
      "roboto-extended",
      "clean"
    ]
  },
  {
    "name": "Mulish",
    "slug": "mulish",
    "category": "Sans Serif",
    "author": "Vernon Adams",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Minimalist sans designed for web display and apps.",
    "description": "Designed for versatility as both a display font and text font across mobile applications.",
    "tags": [
      "minimalist",
      "versatile",
      "web"
    ]
  },
  {
    "name": "Josefin Sans",
    "slug": "josefin-sans",
    "category": "Sans Serif",
    "author": "Santiago Orozco",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Geometric vintage Scandinavian typography aesthetic.",
    "description": "Geometric vintage style with Scandinavian flavor, inspired by 1930s geometric sans serifs.",
    "tags": [
      "vintage",
      "scandinavian",
      "geometric"
    ]
  },
  {
    "name": "Kanit",
    "slug": "kanit",
    "category": "Sans Serif",
    "author": "Cadson Demak",
    "isVariable": false,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Modern Thai and Latin typography with sleek curves.",
    "description": "A sleek, contemporary typeface family combining Thai and Latin glyphs seamlessly.",
    "tags": [
      "thai",
      "sleek",
      "bold"
    ]
  },
  {
    "name": "Karla",
    "slug": "karla",
    "category": "Sans Serif",
    "author": "Jonny Pinhorn",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Grotesque sans with charming idiosyncratic quirks.",
    "description": "A grotesque sans-serif typeface with popular charm and irregular personality.",
    "tags": [
      "quirky",
      "grotesque",
      "editorial"
    ]
  },
  {
    "name": "Overpass",
    "slug": "overpass",
    "category": "Sans Serif",
    "author": "Red Hat, Delve Withrington",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      600,
      700,
      800,
      900
    ],
    "previewText": "Inspired by US Highway Gothic road signage.",
    "description": "Commissioned by Red Hat, inspired by Highway Gothic signage across the United States.",
    "tags": [
      "highway",
      "signage",
      "red-hat"
    ]
  },
  {
    "name": "Titillium Web",
    "slug": "titillium-web",
    "category": "Sans Serif",
    "author": "Accademia di Belle Arti di Urbino",
    "isVariable": false,
    "weights": [
      200,
      300,
      400,
      600,
      700,
      900
    ],
    "previewText": "Born out of the Campi Visivi typographic design master.",
    "description": "Born within the Type Design Master at the Accademia di Belle Arti di Urbino.",
    "tags": [
      "italian",
      "academic",
      "square"
    ]
  },
  {
    "name": "Assistant",
    "slug": "assistant",
    "category": "Sans Serif",
    "author": "Ben Nathan",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Clean Hebrew and Latin sans with pure geometry.",
    "description": "A clean Hebrew and Latin typeface family that harmonizes modern minimalist proportions.",
    "tags": [
      "hebrew",
      "pure",
      "neutral"
    ]
  },
  {
    "name": "PT Sans",
    "slug": "pt-sans",
    "category": "Sans Serif",
    "author": "ParaType",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Russian national font supporting Pan-Cyrillic scripts.",
    "description": "Developed for the 300th anniversary of Russian civil type, supporting Pan-Cyrillic languages.",
    "tags": [
      "cyrillic",
      "russian",
      "para-type"
    ]
  },
  {
    "name": "Cabin",
    "slug": "cabin",
    "category": "Sans Serif",
    "author": "Pablo Impallari",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700
    ],
    "previewText": "Humanist sans inspired by Edward Johnston and Eric Gill.",
    "description": "A humanist sans with 4 proportions, inspired by Edward Johnston and Eric Gill typefaces.",
    "tags": [
      "humanist",
      "gill",
      "johnston"
    ]
  },
  {
    "name": "Exo 2",
    "slug": "exo-2",
    "category": "Sans Serif",
    "author": "Natanael Gama",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Futuristic geometric sans with technical organic flow.",
    "description": "A complete redesign of Exo, maintaining its futuristic techno-organic aesthetics.",
    "tags": [
      "futuristic",
      "sci-fi",
      "techno"
    ]
  },
  {
    "name": "Anton",
    "slug": "anton",
    "category": "Sans Serif",
    "author": "Vernon Adams",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Remodelling of traditional advertising gothic typefaces.",
    "description": "A remodeling of a traditional advertising gothic typeface for digital screens.",
    "tags": [
      "poster",
      "impact",
      "advertising"
    ]
  },
  {
    "name": "Outfit",
    "slug": "outfit",
    "category": "Sans Serif",
    "author": "Rodrigo Fuenzalida",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Contemporary geometric sans designed for digital brand experiences.",
    "description": "Contemporary geometric sans designed for digital brand experiences and elegant displays.",
    "tags": [
      "brand",
      "minimal",
      "expressive"
    ]
  },
  {
    "name": "Space Grotesk",
    "slug": "space-grotesk",
    "category": "Sans Serif",
    "author": "Florian Karsten",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Proportional sans variant based on Space Mono with brutalist details.",
    "description": "A proportional sans-serif variant based on Space Mono with idiosyncratic brutalist details.",
    "tags": [
      "brutalist",
      "space",
      "tech"
    ]
  },
  {
    "name": "Lexend",
    "slug": "lexend",
    "category": "Sans Serif",
    "author": "Thomas Jockin",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Scientifically designed to improve reading proficiency.",
    "description": "Engineered specifically to reduce visual stress and improve reading speed.",
    "tags": [
      "dyslexia",
      "reading",
      "educational"
    ]
  },
  {
    "name": "Archivo",
    "slug": "archivo",
    "category": "Sans Serif",
    "author": "Omnibus-Type",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Engineered for simultaneous digital and print applications.",
    "description": "An Omnibus-Type grotesque sans serif typeface family designed for highlights and headlines.",
    "tags": [
      "omnibus",
      "grotesque",
      "versatile"
    ]
  },
  {
    "name": "Urbanist",
    "slug": "urbanist",
    "category": "Sans Serif",
    "author": "Corey Hu",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Low-contrast, geometric sans inspired by Modernist typography.",
    "description": "Low-contrast, geometric sans-serif inspired by Modernist typography and urban signage.",
    "tags": [
      "modernist",
      "urban",
      "geometric"
    ]
  },
  {
    "name": "Sora",
    "slug": "sora",
    "category": "Sans Serif",
    "author": "Barnbrook",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Crafted for UI cues, low-contrast rendering, and micro-text.",
    "description": "Typeface family designed for on-screen interfaces and low-contrast mobile environments.",
    "tags": [
      "micro-text",
      "japanese-aesthetic",
      "ui"
    ]
  },
  {
    "name": "Syne",
    "slug": "syne",
    "category": "Sans Serif",
    "author": "Bonjour Monde, Lucas Descroix",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Designed for the art center Synesthésie with radical contrast.",
    "description": "Explorative display sans with distinctive high-contrast geometric proportions.",
    "tags": [
      "artistic",
      "experimental",
      "display-sans"
    ]
  },
  {
    "name": "Figtree",
    "slug": "figtree",
    "category": "Sans Serif",
    "author": "Erik Kennedy",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Clean and friendly geometric sans with warm curve terminations.",
    "description": "Clean and friendly geometric sans-serif typeface with confident terminal curves.",
    "tags": [
      "friendly",
      "ui",
      "modern"
    ]
  },
  {
    "name": "Georama",
    "slug": "georama",
    "category": "Sans Serif",
    "author": "Production Type",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Geometrique neo-grotesque with expansive width axes.",
    "description": "Original geometric sans serif family created by Production Type for broad responsive display.",
    "tags": [
      "variable",
      "production-type",
      "grotesk"
    ]
  },
  {
    "name": "Playfair Display",
    "slug": "playfair-display",
    "category": "Serif",
    "author": "Claus Eggers Sørensen",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "High-contrast transitional serif influenced by Enlightenment era.",
    "description": "High-contrast transitional serif typeface influenced by 18th century European letterforms.",
    "tags": [
      "editorial",
      "luxury",
      "classic"
    ]
  },
  {
    "name": "Merriweather",
    "slug": "merriweather",
    "category": "Serif",
    "author": "Sorkin Type",
    "isVariable": false,
    "weights": [
      300,
      400,
      700,
      900
    ],
    "previewText": "Pleasant reading experience at very small text sizes.",
    "description": "Designed to be a text face that is pleasant to read on screens with wide letterforms.",
    "tags": [
      "reading",
      "screen-serif",
      "news"
    ]
  },
  {
    "name": "Lora",
    "slug": "lora",
    "category": "Serif",
    "author": "Cyreal",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700
    ],
    "previewText": "Contemporary serif with balanced brushed calligraphy roots.",
    "description": "Contemporary serif with brushed curves and delicate calligraphy roots.",
    "tags": [
      "calligraphic",
      "storytelling",
      "cyreal"
    ]
  },
  {
    "name": "PT Serif",
    "slug": "pt-serif",
    "category": "Serif",
    "author": "ParaType",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Universal serif for Pan-Cyrillic and Western publishing.",
    "description": "Universal serif companion to PT Sans designed for Russian press and literature.",
    "tags": [
      "cyrillic",
      "publishing",
      "classic"
    ]
  },
  {
    "name": "Noto Serif",
    "slug": "noto-serif",
    "category": "Serif",
    "author": "Google",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Global serif designed to eliminate tofu glyphs worldwide.",
    "description": "Google universal serif typeface family spanning hundreds of languages and scripts.",
    "tags": [
      "google",
      "global",
      "unicode"
    ]
  },
  {
    "name": "EB Garamond",
    "slug": "eb-garamond",
    "category": "Serif",
    "author": "Georg Duffner",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Master revival of Claude Garamont famous 1592 specimen.",
    "description": "Faithful open-source revival of the historical humanist serif cuts by Claude Garamont.",
    "tags": [
      "garamond",
      "humanist",
      "renaissance"
    ]
  },
  {
    "name": "Cormorant Garamond",
    "slug": "cormorant-garamond",
    "category": "Serif",
    "author": "Christian Thalmann",
    "isVariable": false,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Traditional Garamond design with dramatic contrast and fine serifs.",
    "description": "Traditional Garamond design with breathtakingly fine serifs and extravagant contrast.",
    "tags": [
      "garamond",
      "fine",
      "dramatic"
    ]
  },
  {
    "name": "Libre Baskerville",
    "slug": "libre-baskerville",
    "category": "Serif",
    "author": "Impallari Type",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Web-optimized revival of American Type Founders 1941 Baskerville.",
    "description": "Web font optimized for body text on screens, based on the classic American Type Founders Baskerville.",
    "tags": [
      "baskerville",
      "transitional",
      "web-serif"
    ]
  },
  {
    "name": "Bitter",
    "slug": "bitter",
    "category": "Serif",
    "author": "Sol Matas",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Contemporary slab serif designed for comfortable reading on screens.",
    "description": "Contemporary slab serif designed specifically for comfortable reading on electronic displays.",
    "tags": [
      "slab-serif",
      "ebook",
      "reading"
    ]
  },
  {
    "name": "Cinzel",
    "slug": "cinzel",
    "category": "Serif",
    "author": "Natanael Gama",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Inspired by first century Roman inscriptions with classical proportions.",
    "description": "Inspired by first century Roman inscriptions and based on classical proportions.",
    "tags": [
      "roman",
      "inscriptional",
      "monumental"
    ]
  },
  {
    "name": "Roboto Slab",
    "slug": "roboto-slab",
    "category": "Serif",
    "author": "Christian Robertson",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Geometric slab serif companion to standard Roboto font.",
    "description": "Geometric slab serif companion to Roboto with dual-nature mechanical letterforms.",
    "tags": [
      "slab",
      "android",
      "system"
    ]
  },
  {
    "name": "Spectral",
    "slug": "spectral",
    "category": "Serif",
    "author": "Production Type",
    "isVariable": false,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Commissioned by Google Docs for crisp digital reading.",
    "description": "Commissioned by Google for reading long documents in digital environments.",
    "tags": [
      "google-docs",
      "french",
      "reading"
    ]
  },
  {
    "name": "Arvo",
    "slug": "arvo",
    "category": "Serif",
    "author": "Anton Koovit",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Geometric slab serif family suited for screen and print.",
    "description": "Geometric slab-serif typeface family suited for screen and print publishing.",
    "tags": [
      "slab",
      "geometric",
      "finnish"
    ]
  },
  {
    "name": "Crimson Text",
    "slug": "crimson-text",
    "category": "Serif",
    "author": "Sebastian Kosch",
    "isVariable": false,
    "weights": [
      400,
      600,
      700
    ],
    "previewText": "Book production font inspired by Tschichold and Garamond.",
    "description": "Book production typeface inspired by the great masters of Renaissance printing.",
    "tags": [
      "book",
      "oldstyle",
      "academic"
    ]
  },
  {
    "name": "Domine",
    "slug": "domine",
    "category": "Serif",
    "author": "Impallari Type",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700
    ],
    "previewText": "Designed for long body text on electronic displays and devices.",
    "description": "Crafted for editorial body text with robust serifs and open apertures.",
    "tags": [
      "editorial",
      "news",
      "warm"
    ]
  },
  {
    "name": "Zilla Slab",
    "slug": "zilla-slab",
    "category": "Serif",
    "author": "Mozilla, Peter Biľak",
    "isVariable": false,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Custom brand typeface crafted for Mozilla core identity.",
    "description": "Mozilla core brand typeface featuring industrial slab serifs with smooth curved transitions.",
    "tags": [
      "mozilla",
      "open-source",
      "industrial"
    ]
  },
  {
    "name": "Frank Ruhl Libre",
    "slug": "frank-ruhl-libre",
    "category": "Serif",
    "author": "Yanek Iontef",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      700,
      900
    ],
    "previewText": "Classic Hebrew and Latin serif with distinguished high x-height.",
    "description": "Revival of the classic Hebrew and Latin typeface, widely used in books and newspapers.",
    "tags": [
      "hebrew",
      "classical",
      "literary"
    ]
  },
  {
    "name": "Bodoni Moda",
    "slug": "bodoni-moda",
    "category": "Serif",
    "author": "Marcello Colombini",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Sensational high-contrast Modern Didone tailored for haute couture.",
    "description": "Sensational high-contrast Modern Didone tailored for haute couture and high-end publications.",
    "tags": [
      "bodoni",
      "fashion",
      "luxury"
    ]
  },
  {
    "name": "Cardo",
    "slug": "cardo",
    "category": "Serif",
    "author": "David Perry",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Designed specifically for classicists, medievalists, and linguists.",
    "description": "Scholarly humanist typeface designed for classicists, medievalists, and linguists.",
    "tags": [
      "scholarly",
      "renaissance",
      "bembo"
    ]
  },
  {
    "name": "Faustina",
    "slug": "faustina",
    "category": "Serif",
    "author": "Omnibus-Type",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Designed for print and web editorial publishing with compact proportions.",
    "description": "Omnibus-Type editorial serif with robust terminals and clean digital rendering.",
    "tags": [
      "editorial",
      "compact",
      "omnibus"
    ]
  },
  {
    "name": "Castoro",
    "slug": "castoro",
    "category": "Serif",
    "author": "John Hudson, Paul Hanslow",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Named after the North American beaver; an academic scholarly workhorse.",
    "description": "Named after the Canadian beaver, Castoro is an academic workhorse for scholarly articles.",
    "tags": [
      "scholarly",
      "tiro",
      "academic"
    ]
  },
  {
    "name": "Prata",
    "slug": "prata",
    "category": "Serif",
    "author": "Cyreal",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Elegant Didone typeface with teardrop terminals and delicate serifs.",
    "description": "Didone typeface with teardrop terminals and delicate, sharp serifs.",
    "tags": [
      "didone",
      "fashion",
      "teardrop"
    ]
  },
  {
    "name": "Besley",
    "slug": "besley",
    "category": "Serif",
    "author": "Owen Earl",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Revival of the first ever patented Clarendon typeface by Robert Besley.",
    "description": "Revival of the first patented Clarendon typeface, engineered for modern screens.",
    "tags": [
      "clarendon",
      "heritage",
      "slab"
    ]
  },
  {
    "name": "DM Serif Display",
    "slug": "dm-serif-display",
    "category": "Serif",
    "author": "Colophon Foundry",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "High-contrast transitional serif display face with delicate teardrop terminals.",
    "description": "High-contrast transitional serif display typeface designed for posters and editorial headlines.",
    "tags": [
      "colophon",
      "display-serif",
      "transitional"
    ]
  },
  {
    "name": "Vollkorn",
    "slug": "vollkorn",
    "category": "Serif",
    "author": "Friedrich Althausen",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "Quiet and modest text face with sturdy dark serifs.",
    "description": "Intended to be a quiet, modest, and well-working text typeface for books.",
    "tags": [
      "german",
      "book",
      "sturdy"
    ]
  },
  {
    "name": "Newsreader",
    "slug": "newsreader",
    "category": "Serif",
    "author": "Production Type",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800
    ],
    "previewText": "Original serif typeface designed for continuous digital long-form reading.",
    "description": "Original serif typeface designed for continuous on-screen reading in long-form media.",
    "tags": [
      "long-form",
      "production-type",
      "reading"
    ]
  },
  {
    "name": "Old Standard TT",
    "slug": "old-standard-tt",
    "category": "Serif",
    "author": "Alexey Kryukov",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Revival of classic 19th and 20th century edition typefaces.",
    "description": "Revival of a classic style of edition type widely used in 19th-century scientific books.",
    "tags": [
      "19th-century",
      "academic",
      "classic"
    ]
  },
  {
    "name": "Marcellus",
    "slug": "marcellus",
    "category": "Serif",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Flared serif based on historic Roman inscription titling.",
    "description": "Flared serif typeface based on historic Roman monumental letterforms.",
    "tags": [
      "roman",
      "titling",
      "flared"
    ]
  },
  {
    "name": "JetBrains Mono",
    "slug": "jetbrains-mono",
    "category": "Monospace",
    "author": "JetBrains",
    "isVariable": false,
    "weights": [
      400,
      500,
      700
    ],
    "previewText": "const fontify = async () => true;",
    "description": "A typeface made for developers with distinct character shapes and programming ligatures.",
    "tags": [
      "code",
      "programming",
      "developer",
      "ligatures"
    ]
  },
  {
    "name": "Fira Code",
    "slug": "fira-code",
    "category": "Monospace",
    "author": "Nikita Prokopov",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "if (x !== null && y >= 10) => result;",
    "description": "Free monospaced font containing ligatures for common programming multi-character combinations.",
    "tags": [
      "code",
      "ligatures",
      "terminal"
    ]
  },
  {
    "name": "Roboto Mono",
    "slug": "roboto-mono",
    "category": "Monospace",
    "author": "Christian Robertson",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "function format(val: number): string;",
    "description": "Monospaced addition to the Roboto type family with readable geometry.",
    "tags": [
      "android",
      "google",
      "terminal"
    ]
  },
  {
    "name": "Inconsolata",
    "slug": "inconsolata",
    "category": "Monospace",
    "author": "Raph Levien",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "grep -rn \"pattern\" ./src/ | wc -l",
    "description": "Monospaced font designed for printed code listings and terminal emulators.",
    "tags": [
      "terminal",
      "hacker",
      "clean"
    ]
  },
  {
    "name": "Source Code Pro",
    "slug": "source-code-pro",
    "category": "Monospace",
    "author": "Paul D. Hunt",
    "isVariable": true,
    "weights": [
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900
    ],
    "previewText": "SELECT id, name FROM users WHERE active = 1;",
    "description": "Adobe monospaced typeface designed specifically for coding environments.",
    "tags": [
      "adobe",
      "coding",
      "legible"
    ]
  },
  {
    "name": "Space Mono",
    "slug": "space-mono",
    "category": "Monospace",
    "author": "Colophon Foundry",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "MISSION_CONTROL: APOLLO_11 STATUS_OK",
    "description": "Original fixed-width type family developed for editorial use in headline sizes.",
    "tags": [
      "brutalist",
      "retro-futurism",
      "headline"
    ]
  },
  {
    "name": "IBM Plex Mono",
    "slug": "ibm-plex-mono",
    "category": "Monospace",
    "author": "Mike Abbink, Bold Monday",
    "isVariable": false,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "SYSTEM/360 OPERATING ENVIRONMENT ACTIVE",
    "description": "IBM official open-source corporate mono typeface capturing human and machine harmony.",
    "tags": [
      "ibm",
      "corporate",
      "engineered"
    ]
  },
  {
    "name": "Ubuntu Mono",
    "slug": "ubuntu-mono",
    "category": "Monospace",
    "author": "Dalton Maag",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "sudo apt-get update && sudo apt-get upgrade",
    "description": "Monospaced variant of the Ubuntu font family for shell terminals.",
    "tags": [
      "linux",
      "canonical",
      "terminal"
    ]
  },
  {
    "name": "Courier Prime",
    "slug": "courier-prime",
    "category": "Monospace",
    "author": "Quote-Unquote Apps",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "INT. COFFEE SHOP - DAY. A writer types furiously.",
    "description": "Custom courier revival designed specifically for screenplay and script writing.",
    "tags": [
      "screenplay",
      "typewriter",
      "scriptwriting"
    ]
  },
  {
    "name": "Anonymous Pro",
    "slug": "anonymous-pro",
    "category": "Monospace",
    "author": "Mark Simonson",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "0123456789 O0 Il1 {} [] <>",
    "description": "Fixed-width typeface family designed especially for coding with zero-character confusion.",
    "tags": [
      "coding",
      "disambiguation",
      "fixed-width"
    ]
  },
  {
    "name": "Overpass Mono",
    "slug": "overpass-mono",
    "category": "Monospace",
    "author": "Delve Withrington",
    "isVariable": false,
    "weights": [
      300,
      400,
      600,
      700
    ],
    "previewText": "ROUTE 66 WESTBOUND NEXT EXIT 2 MILES",
    "description": "Monospaced variation of Red Hat Overpass inspired by transportation signage.",
    "tags": [
      "red-hat",
      "signage",
      "highway"
    ]
  },
  {
    "name": "Red Hat Mono",
    "slug": "red-hat-mono",
    "category": "Monospace",
    "author": "MCKL",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "docker run -d -p 8080:80 nginx:alpine",
    "description": "Proportional-to-fixed width translation of the Red Hat brand font family.",
    "tags": [
      "red-hat",
      "cloud",
      "modern"
    ]
  },
  {
    "name": "Victor Mono",
    "slug": "victor-mono",
    "category": "Monospace",
    "author": "Rune Bjørnerås",
    "isVariable": true,
    "weights": [
      100,
      200,
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "let cursiveItalics = true; // elegant code",
    "description": "Clean programming mono featuring semi-connected cursive italics and coding ligatures.",
    "tags": [
      "cursive-italic",
      "ligatures",
      "developer"
    ]
  },
  {
    "name": "Share Tech Mono",
    "slug": "share-tech-mono",
    "category": "Monospace",
    "author": "Carrois Apostrophe",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "TARGET_LOCKED: COORDINATES 34.0522 N 118.2437 W",
    "description": "Monospaced techno design inspired by heads-up displays and cybernetic interfaces.",
    "tags": [
      "cyberpunk",
      "hud",
      "military"
    ]
  },
  {
    "name": "Cousine",
    "slug": "cousine",
    "category": "Monospace",
    "author": "Steve Matteson",
    "isVariable": false,
    "weights": [
      400,
      700
    ],
    "previewText": "Universal monospaced metric-compatible with Courier.",
    "description": "Universal monospaced design offering improved on-screen legibility and Courier compatibility.",
    "tags": [
      "courier-compatible",
      "print",
      "fixed"
    ]
  },
  {
    "name": "Cutive Mono",
    "slug": "cutive-mono",
    "category": "Monospace",
    "author": "Vernon Adams",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Classic literary typewriter aesthetic for personal letters.",
    "description": "Based on typewriter typefaces from the early 20th century with literary warmth.",
    "tags": [
      "typewriter",
      "literary",
      "vintage"
    ]
  },
  {
    "name": "Nova Mono",
    "slug": "nova-mono",
    "category": "Monospace",
    "author": "Wojciech Kalinowski",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Futuristic monolinear rounded monospaced character forms.",
    "description": "Stylized futuristic monolinear fixed-width typeface with rounded geometry.",
    "tags": [
      "monolinear",
      "stylized",
      "display"
    ]
  },
  {
    "name": "VT323",
    "slug": "vt323",
    "category": "Monospace",
    "author": "Peter Hull",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "READY. LOAD \"*\",8,1 RUN",
    "description": "Pixelated terminal font based on the DEC VT220 computer terminal.",
    "tags": [
      "pixel",
      "terminal",
      "retro-8bit"
    ]
  },
  {
    "name": "Bebas Neue",
    "slug": "bebas-neue",
    "category": "Display",
    "author": "Ryoichi Tsunekawa",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG",
    "description": "All-caps display font with clean lines and elegant towering proportions.",
    "tags": [
      "all-caps",
      "headline",
      "tall"
    ]
  },
  {
    "name": "Lobster",
    "slug": "lobster",
    "category": "Display",
    "author": "Impallari Type",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Authentic retro American sign-painting script.",
    "description": "Bold retro script drawn with many ligatures and alternate glyphs.",
    "tags": [
      "retro",
      "script",
      "bold"
    ]
  },
  {
    "name": "Abril Fatface",
    "slug": "abril-fatface",
    "category": "Display",
    "author": "TypeTogether",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "High-drama Victorian titling serif with massive contrast.",
    "description": "Inspired by heavy titling fonts used on advertising posters in 19th-century Britain.",
    "tags": [
      "victorian",
      "poster",
      "didone"
    ]
  },
  {
    "name": "Righteous",
    "slug": "righteous",
    "category": "Display",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Art Deco geometry inspired by 1930s futuristic posters.",
    "description": "Geometric Art Deco display font inspired by mid-century futuristic lettering.",
    "tags": [
      "art-deco",
      "retro-future",
      "grid"
    ]
  },
  {
    "name": "Comfortaa",
    "slug": "comfortaa",
    "category": "Display",
    "author": "Johan Aakerlund",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Ultra-smooth rounded geometric display design.",
    "description": "Rounded geometric sans-serif type design intended for large headers and icons.",
    "tags": [
      "rounded",
      "friendly",
      "minimal"
    ]
  },
  {
    "name": "Alfa Slab One",
    "slug": "alfa-slab-one",
    "category": "Display",
    "author": "JM Solé",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Extremely heavy slab serif with 19th-century six-line pica power.",
    "description": "Contemporary take on the 19th century Six-lines Pica Egyptian slab serifs.",
    "tags": [
      "slab",
      "heavy",
      "headline"
    ]
  },
  {
    "name": "Bangers",
    "slug": "bangers",
    "category": "Display",
    "author": "Vernon Adams",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "POW! BAM! CLASSIC MID-CENTURY COMIC BOOK HEADLINE",
    "description": "Comic book headline font inspired by classic mid-century superhero covers.",
    "tags": [
      "comic",
      "cartoon",
      "loud"
    ]
  },
  {
    "name": "Fredoka",
    "slug": "fredoka",
    "category": "Display",
    "author": "Hafontia",
    "isVariable": true,
    "weights": [
      300,
      400,
      500,
      600,
      700
    ],
    "previewText": "Charming modern rounded sans with warm playful geometry.",
    "description": "Fresh, charming rounded display font family with warm personality.",
    "tags": [
      "rounded",
      "cute",
      "friendly"
    ]
  },
  {
    "name": "Cinzel Decorative",
    "slug": "cinzel-decorative",
    "category": "Display",
    "author": "Natanael Gama",
    "isVariable": false,
    "weights": [
      400,
      700,
      900
    ],
    "previewText": "Roman classical inscriptional titling with dramatic flourishes.",
    "description": "Decorative variant of Cinzel with ornate swashes and majestic flourishes.",
    "tags": [
      "swash",
      "roman",
      "epic"
    ]
  },
  {
    "name": "Bungee",
    "slug": "bungee",
    "category": "Display",
    "author": "David Jonathan Ross",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "URBAN SIGNAGE CELEBRATING VERTICAL ARCHITECTURE",
    "description": "Celebrates urban signage and can adapt to horizontal and vertical layouts.",
    "tags": [
      "signage",
      "block",
      "heavy"
    ]
  },
  {
    "name": "Permanent Marker",
    "slug": "permanent-marker",
    "category": "Display",
    "author": "Font Diner",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Thick indelible marker pen lettering for spontaneous ideas.",
    "description": "Recreates the look and feel of a favorite permanent ink marker.",
    "tags": [
      "marker",
      "ink",
      "handdrawn"
    ]
  },
  {
    "name": "Monoton",
    "slug": "monoton",
    "category": "Display",
    "author": "Vernon Adams",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "DISCO ERA MULTI-LINE RETRO GEOMETRIC DISPLAY",
    "description": "Contemporary take on metal multi-line fonts of the 1970s and 1980s disco scene.",
    "tags": [
      "disco",
      "multiline",
      "retro"
    ]
  },
  {
    "name": "Audiowide",
    "slug": "audiowide",
    "category": "Display",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "CYBERNETIC TECHNO DISPLAY TYPOGRAPHY",
    "description": "Techno-futuristic display font with angular cutouts and wide stance.",
    "tags": [
      "sci-fi",
      "techno",
      "wide"
    ]
  },
  {
    "name": "Press Start 2P",
    "slug": "press-start-2p",
    "category": "Display",
    "author": "CodeMan38",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "1-UP HIGH SCORE 999990 INSERT COIN",
    "description": "Bitmap pixel font based on 1980s arcade machine title screens.",
    "tags": [
      "pixel",
      "arcade",
      "8-bit"
    ]
  },
  {
    "name": "Creepster",
    "slug": "creepster",
    "category": "Display",
    "author": "Sideshow",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "CREEPY CHILLING HORROR B-MOVIE TITLES",
    "description": "Frightening display face perfect for spooky events and horror titles.",
    "tags": [
      "horror",
      "halloween",
      "spooky"
    ]
  },
  {
    "name": "Faster One",
    "slug": "faster-one",
    "category": "Display",
    "author": "Eduardo Tunni",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "SUPERSONIC VELOCITY HORIZONTAL SPEED STROKES",
    "description": "Clean horizontal lines give this typeface an undeniable sense of speed and motion.",
    "tags": [
      "speed",
      "racing",
      "stripes"
    ]
  },
  {
    "name": "Shrikhand",
    "slug": "shrikhand",
    "category": "Display",
    "author": "Jonny Pinhorn",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Vibrant Gujarati handpainted street sign typography.",
    "description": "Born out of handpainted lettering seen on the streets of Gujarat, India.",
    "tags": [
      "handpainted",
      "street",
      "bombay"
    ]
  },
  {
    "name": "Russo One",
    "slug": "russo-one",
    "category": "Display",
    "author": "Jovanny Lemonad",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "BOLD DYNAMIC CONSTRUCTIVIST RUSSIAN DISPLAY",
    "description": "Bold and confident Russian headline typeface with constructivist vibes.",
    "tags": [
      "constructivist",
      "monumental",
      "heavy"
    ]
  },
  {
    "name": "Special Elite",
    "slug": "special-elite",
    "category": "Display",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Inked mechanical typewriter strikes from 1920s archives.",
    "description": "Simulates the inked ribbon strike of vintage Remington Smith-Corona typewriters.",
    "tags": [
      "typewriter",
      "grunge",
      "classified"
    ]
  },
  {
    "name": "Titan One",
    "slug": "titan-one",
    "category": "Display",
    "author": "Rodrigo Fuenzalida",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "SHORT PLUMP TITLING WITH HIGH IMPACT FUN",
    "description": "Short plump titling font with enormous weight and high-impact cheerfulness.",
    "tags": [
      "plump",
      "cartoon",
      "heavy"
    ]
  },
  {
    "name": "Caveat",
    "slug": "caveat",
    "category": "Handwriting",
    "author": "Impallari Type",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700
    ],
    "previewText": "Casual handwritten notes written with a gel ink pen.",
    "description": "Casual handwriting font designed for short annotations and personal notes.",
    "tags": [
      "casual",
      "pen",
      "notes"
    ]
  },
  {
    "name": "Dancing Script",
    "slug": "dancing-script",
    "category": "Handwriting",
    "author": "Impallari Type",
    "isVariable": true,
    "weights": [
      400,
      500,
      600,
      700
    ],
    "previewText": "Lively bounce script with changing baseline heights.",
    "description": "Lively casual script where the letters bounce and change size slightly.",
    "tags": [
      "bounce",
      "cursive",
      "friendly"
    ]
  },
  {
    "name": "Pacifico",
    "slug": "pacifico",
    "category": "Handwriting",
    "author": "Vernon Adams",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Original brush script inspired by 1950s American surf culture.",
    "description": "Delightful brush script inspired by the 1950s American surf culture.",
    "tags": [
      "surf",
      "retro",
      "brush"
    ]
  },
  {
    "name": "Satisfy",
    "slug": "satisfy",
    "category": "Handwriting",
    "author": "Sideshow",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Timeless cursive handwriting with modern flare and ease.",
    "description": "Timeless cursive handwriting with a modern flare and casual elegance.",
    "tags": [
      "cursive",
      "classic",
      "brush"
    ]
  },
  {
    "name": "Sacramento",
    "slug": "sacramento",
    "category": "Handwriting",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Slender semi-connected monoline script from mid-century art.",
    "description": "Monoline semi-connected script inspired by hand-lettering work of the 1950s.",
    "tags": [
      "monoline",
      "chic",
      "delicate"
    ]
  },
  {
    "name": "Great Vibes",
    "slug": "great-vibes",
    "category": "Handwriting",
    "author": "TypeSETit",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Flowing formal calligraphy with looping ascenders and descenders.",
    "description": "Flowing cursive script featuring graceful looping ascenders and descenders.",
    "tags": [
      "formal",
      "calligraphy",
      "wedding"
    ]
  },
  {
    "name": "Shadows Into Light",
    "slug": "shadows-into-light",
    "category": "Handwriting",
    "author": "Kimberly Geswein",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Neat feminine handwritten lettering with playful quirks.",
    "description": "Neat feminine handwriting font with clean lines and rounded strokes.",
    "tags": [
      "feminine",
      "neat",
      "personal"
    ]
  },
  {
    "name": "Indie Flower",
    "slug": "indie-flower",
    "category": "Handwriting",
    "author": "Kimberly Geswein",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Carefree, bubbling handwriting with cheerful rounded strokes.",
    "description": "Carefree, bubbly handwriting font with open curves and cheerful flow.",
    "tags": [
      "carefree",
      "cheerful",
      "bubbles"
    ]
  },
  {
    "name": "Yellowtail",
    "slug": "yellowtail",
    "category": "Handwriting",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Old school sign painter flat brush script with connected strokes.",
    "description": "Old school flat brush script inspired by mid-century sign painter lettering.",
    "tags": [
      "sign-painter",
      "flat-brush",
      "retro"
    ]
  },
  {
    "name": "Kalam",
    "slug": "kalam",
    "category": "Handwriting",
    "author": "Indian Type Foundry",
    "isVariable": false,
    "weights": [
      300,
      400,
      700
    ],
    "previewText": "Devanagari and Latin handwriting drawn with a ballpoint pen.",
    "description": "Devanagari and Latin handwriting typeface with organic ballpoint pen qualities.",
    "tags": [
      "ballpoint",
      "devanagari",
      "casual"
    ]
  },
  {
    "name": "Marck Script",
    "slug": "marck-script",
    "category": "Handwriting",
    "author": "Marck Fogel",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Free-spirited cursive lettering with expressive loops.",
    "description": "Freehand script font based on cursive felt-tip pen calligraphy.",
    "tags": [
      "cursive",
      "freehand",
      "poetic"
    ]
  },
  {
    "name": "Kaushan Script",
    "slug": "kaushan-script",
    "category": "Handwriting",
    "author": "Impallari Type",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Rustic felt-tip calligraphy with energetic raw textures.",
    "description": "Rustic felt-tip calligraphy with energetic raw textures and bold strokes.",
    "tags": [
      "felt-tip",
      "rustic",
      "textured"
    ]
  },
  {
    "name": "Bad Script",
    "slug": "bad-script",
    "category": "Handwriting",
    "author": "Roman Shchyukin",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Casual notebook pen script with natural letter variations.",
    "description": "Drawn with a fountain pen in a notebook, capturing authentic personal handwriting.",
    "tags": [
      "notebook",
      "casual",
      "pen"
    ]
  },
  {
    "name": "Alex Brush",
    "slug": "alex-brush",
    "category": "Handwriting",
    "author": "TypeSETit",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Smooth flowing brush script with immaculate connected elegance.",
    "description": "Smooth flowing brush script with classic calligraphy flourishes and clean legibility.",
    "tags": [
      "elegant",
      "script",
      "invitations"
    ]
  },
  {
    "name": "Cookie",
    "slug": "cookie",
    "category": "Handwriting",
    "author": "Anke Arnold",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "1950s pin-up ad script with soft brush transitions.",
    "description": "Bookish brush script reminiscent of 1950s pin-up ads and retro advertisements.",
    "tags": [
      "pin-up",
      "vintage",
      "sweet"
    ]
  },
  {
    "name": "Courgette",
    "slug": "courgette",
    "category": "Handwriting",
    "author": "Karolina Lach",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Medium-contrast brush script with distinct upright posture.",
    "description": "Medium-contrast brush script with a compact, upright posture and friendly loops.",
    "tags": [
      "upright",
      "compact",
      "brush"
    ]
  },
  {
    "name": "Allura",
    "slug": "allura",
    "category": "Handwriting",
    "author": "TypeSETit",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Stylized, easy-to-read script with soft flowing curves.",
    "description": "Stylized, easy-to-read script font designed for elegant certificates and packaging.",
    "tags": [
      "invitation",
      "gentle",
      "cursive"
    ]
  },
  {
    "name": "Parisienne",
    "slug": "parisienne",
    "category": "Handwriting",
    "author": "Astigmatic",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Casual classic French script with an intentional slight bounce.",
    "description": "Casual classic French script with intentional bounce and freeform joie de vivre.",
    "tags": [
      "french",
      "chic",
      "romance"
    ]
  },
  {
    "name": "Gloria Hallelujah",
    "slug": "gloria-hallelujah",
    "category": "Handwriting",
    "author": "Kimberly Geswein",
    "isVariable": false,
    "weights": [
      400
    ],
    "previewText": "Drawn from the handwriting of a Korean high school teacher.",
    "description": "Fun, spontaneous handwritten typeface with bold, lively strokes.",
    "tags": [
      "teacher",
      "fun",
      "marker"
    ]
  }
];

/**
 * Curated Top Google Fonts Families (~100-150 families)
 * Covers Sans Serif, Serif, Monospace, Display, and Handwriting
 */
export const BUNDLED_GOOGLE_FONTS: BrowseItem[] = GOOGLE_FONT_DEFINITIONS.map((def) => {
  const isVar = def.isVariable;
  const axes = def.variableAxes || (isVar ? ['wght'] : []);
  const defaultWeight = def.weights.includes(400) ? 400 : def.weights[0];
  const variableUrl = isVar ? (def.variableUrl || getGoogleVariableFontUrl(def.slug)) : undefined;
  const staticDefaultUrl = fontsourceUrl(def.slug, defaultWeight);
  const url = (isVar && variableUrl) ? variableUrl : staticDefaultUrl;
  const sizeMb = def.sizeMb || (isVar ? '0.8 MB' : '0.2 MB');

  const variants: FontVariant[] = [];
  if (isVar && variableUrl) {
    variants.push({
      name: 'Variable (100–900)',
      weight: '100-900',
      style: 'normal',
      url: variableUrl,
      sizeMb,
      isVariable: true
    });
  }

  for (const w of def.weights) {
    variants.push({
      name: weightName(w),
      weight: w,
      style: 'normal' as const,
      url: fontsourceUrl(def.slug, w),
      sizeMb: isVar ? '0.8 MB' : '0.2 MB',
      isVariable: false,
      ...(isVar ? { axisValues: { wght: w } } : {})
    });
  }

  return {
    id: `gf-${def.slug}`,
    name: def.name,
    type: 'font' as const,
    source: 'google' as const,
    category: def.category,
    author: def.author,
    description: def.description,
    previewText: def.previewText,
    thumbnailUrl: svgThumbnail(def.name, def.category),
    isVariable: isVar,
    variableAxes: axes,
    variableUrl,
    availableWeights: def.weights,
    weights: def.weights,
    sizeMb,
    url,
    tags: ['google', def.category.toLowerCase(), ...def.tags, ...(isVar ? ['variable'] : [])],
    variants
  };
});

/**
 * zFont Fonts (Empty - all zFont font entries removed per requirements)
 */
export const BUNDLED_ZFONT_FONTS: BrowseItem[] = [];

/**
 * zFont Emojis linked from existing EMOJI_CATALOG with authentic specimen preview images (accelerated via edge CDN)
 */
export const BUNDLED_ZFONT_EMOJIS: BrowseItem[] = EMOJI_CATALOG.map((item) => {
  const previewImgUrl = item.url.includes('zFont/Host')
    ? item.url
        .replace('https://raw.githubusercontent.com/zFont/Host/main/', 'https://cdn.jsdelivr.net/gh/zFont/Host@main/')
        .replace('/Font/', '/Preview/')
        .replace(/\.ttf$/, '.png')
    : 'https://cdn.jsdelivr.net/gh/zFont/Host@main/Preview/Emoji/2024/NotoColorEmojiu16PNG_v041024[MFFMEmoji].png';
  return {
    id: `emoji-${item.id}`,
    name: item.name,
    type: 'emoji' as const,
    source: 'zfont' as const,
    category: 'Emoji',
    author: item.author,
    sizeMb: item.sizeMb,
    url: item.url,
    thumbnailUrl: previewImgUrl,
    previewText: '😀 🚀 🎉 ❤️ ✨ 🌟 🔥 💡 📱 👍 💯',
    description: `${item.name} emoji pack by ${item.author} (${item.sizeMb}).`,
    variants: [
      {
        name: 'Default',
        weight: 400,
        url: item.url,
        sizeMb: item.sizeMb
      }
    ],
    tags: [
      'emoji',
      'color',
      item.author.toLowerCase(),
      item.name.toLowerCase().replace(/[^a-z0-9]/g, ' ')
    ]
  };
});

/**
 * Complete pre-bundled catalog combined for 0ms offline first-paint
 * (Contains BUNDLED_GOOGLE_FONTS and BUNDLED_ZFONT_EMOJIS)
 */
export const BUNDLED_CATALOG: BrowseItem[] = [
  ...BUNDLED_GOOGLE_FONTS,
  ...BUNDLED_ZFONT_EMOJIS
];
