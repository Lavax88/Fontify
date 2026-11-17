/**
 * Fontify - Authentic Variable Font Resolver
 * Maps Google Fonts variable font families to genuine TrueType OpenType binaries (.ttf)
 * containing authentic 'fvar' tables, continuous variation axes, and named instances.
 */

export const GOOGLE_VARIABLE_FONT_PATHS: Record<string, string> = {
  'inter': 'ofl/inter/Inter[opsz,wght].ttf',
  'open-sans': 'ofl/opensans/OpenSans[wdth,wght].ttf',
  'montserrat': 'ofl/montserrat/Montserrat[wght].ttf',
  'nunito': 'ofl/nunito/Nunito[wght].ttf',
  'nunito-sans': 'ofl/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf',
  'raleway': 'ofl/raleway/Raleway[wght].ttf',
  'work-sans': 'ofl/worksans/WorkSans[wght].ttf',
  'plus-jakarta-sans': 'ofl/plusjakartasans/PlusJakartaSans[wght].ttf',
  'dm-sans': 'ofl/dmsans/DMSans[opsz,wght].ttf',
  'rubik': 'ofl/rubik/Rubik[wght].ttf',
  'source-sans-3': 'ofl/sourcesans3/SourceSans3[wght].ttf',
  'oswald': 'ofl/oswald/Oswald[wght].ttf',
  'quicksand': 'ofl/quicksand/Quicksand[wght].ttf',
  'manrope': 'ofl/manrope/Manrope[wght].ttf',
  'heebo': 'ofl/heebo/Heebo[wght].ttf',
  'mulish': 'ofl/mulish/Mulish[wght].ttf',
  'josefin-sans': 'ofl/josefinsans/JosefinSans[wght].ttf',
  'karla': 'ofl/karla/Karla[wght].ttf',
  'overpass': 'ofl/overpass/Overpass[wght].ttf',
  'assistant': 'ofl/assistant/Assistant[wght].ttf',
  'cabin': 'ofl/cabin/Cabin[wdth,wght].ttf',
  'exo-2': 'ofl/exo2/Exo2[wght].ttf',
  'outfit': 'ofl/outfit/Outfit[wght].ttf',
  'space-grotesk': 'ofl/spacegrotesk/SpaceGrotesk[wght].ttf',
  'lexend': 'ofl/lexend/Lexend[wght].ttf',
  'archivo': 'ofl/archivo/Archivo[wdth,wght].ttf',
  'urbanist': 'ofl/urbanist/Urbanist[wght].ttf',
  'sora': 'ofl/sora/Sora[wght].ttf',
  'syne': 'ofl/syne/Syne[wght].ttf',
  'figtree': 'ofl/figtree/Figtree[wght].ttf',
  'georama': 'ofl/georama/Georama[wdth,wght].ttf',
  'playfair-display': 'ofl/playfairdisplay/PlayfairDisplay[wght].ttf',
  'lora': 'ofl/lora/Lora[wght].ttf',
  'noto-serif': 'ofl/notoserif/NotoSerif[wdth,wght].ttf',
  'eb-garamond': 'ofl/ebgaramond/EBGaramond[wght].ttf',
  'bitter': 'ofl/bitter/Bitter[wght].ttf',
  'cinzel': 'ofl/cinzel/Cinzel[wght].ttf',
  'roboto-slab': 'apache/robotoslab/RobotoSlab[wght].ttf',
  'domine': 'ofl/domine/Domine[wght].ttf',
  'frank-ruhl-libre': 'ofl/frankruhllibre/FrankRuhlLibre[wght].ttf',
  'bodoni-moda': 'ofl/bodonimoda/BodoniModa[opsz,wght].ttf',
  'faustina': 'ofl/faustina/Faustina[wght].ttf',
  'besley': 'ofl/besley/Besley[wght].ttf',
  'vollkorn': 'ofl/vollkorn/Vollkorn[wght].ttf',
  'newsreader': 'ofl/newsreader/Newsreader[opsz,wght].ttf',
  'fira-code': 'ofl/firacode/FiraCode[wght].ttf',
  'roboto-mono': 'ofl/robotomono/RobotoMono[wght].ttf',
  'inconsolata': 'ofl/inconsolata/Inconsolata[wdth,wght].ttf',
  'source-code-pro': 'ofl/sourcecodepro/SourceCodePro[wght].ttf',
  'red-hat-mono': 'ofl/redhatmono/RedHatMono[wght].ttf',
  'victor-mono': 'ofl/victormono/VictorMono[wght].ttf',
  'comfortaa': 'ofl/comfortaa/Comfortaa[wght].ttf',
  'fredoka': 'ofl/fredoka/Fredoka[wdth,wght].ttf',
  'caveat': 'ofl/caveat/Caveat[wght].ttf',
  'dancing-script': 'ofl/dancingscript/DancingScript[wght].ttf'
};

/**
 * Returns the raw.githubusercontent authentic TTF URL for a Google variable font family.
 */
export function getGoogleVariableFontUrl(slug: string): string | undefined {
  const normalizedSlug = slug.toLowerCase().trim();
  const cleanKey = normalizedSlug.replace(/-/g, '');
  const relPath = GOOGLE_VARIABLE_FONT_PATHS[normalizedSlug] || GOOGLE_VARIABLE_FONT_PATHS[cleanKey];

  if (!relPath) return undefined;
  const encodedPath = relPath.replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/,/g, '%2C');
  return `https://raw.githubusercontent.com/google/fonts/main/${encodedPath}`;
}

/**
 * Checks whether an OpenType / TrueType font buffer contains the 'fvar' table.
 */
export function hasFvarTable(buffer: ArrayBuffer | null | undefined): boolean {
  if (!buffer || buffer.byteLength < 12) return false;
  try {
    const view = new DataView(buffer);
    const numTables = view.getUint16(4);
    let offset = 12;
    for (let i = 0; i < numTables; i++) {
      if (offset + 16 > buffer.byteLength) break;
      const tag = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      if (tag === 'fvar') return true;
      offset += 16;
    }
  } catch (_) {
    return false;
  }
  return false;
}
