// <nowiki>
import { parseTemplates } from '@utils/parseTemplates.js';

// Apply banner insertion into talk wikitext, preserving content layout.
// Mirrors existing transformTalkWikitext logic but as a pure function.
// Parameters:
// - talkWikitext: string original page wikitext (section 0)
// - bannersWikitext: string generated banners block
// - existingBannerNames: string[] names of banners currently present in UI
// Returns: updated wikitext string
const applyBannerInsert = function ( talkWikitext, bannersWikitext, existingBannerNames ) {
	const bannersBlock = String( bannersWikitext || '' ).trim();
	let base = String( talkWikitext || '' );
	if ( !base ) {
		return bannersBlock;
	}

	// Reparse templates to locate existing banners
	let talkTemplates = [];
	try {
		talkTemplates = parseTemplates( base, true ) || [];
	} catch ( _e ) { /* ignore */ }

	// Replace existing banners (by name) with control char \x01
	( talkTemplates || [] ).forEach( ( template ) => {
		try {
			if ( Array.isArray( existingBannerNames ) && existingBannerNames.includes( template.name ) ) {
				base = base.replace( template.wikitext, '\x01' );
			}
		} catch ( _e ) { /* ignore */ }
	} );

	// Mark insertion point at first banner position
	base = base.replace( '\x01', '\x02' );
	// Remove all other placeholders (and their surrounding whitespace)
	base = base.replace( /(?:\s|\n)*\x01(?:\s|\n)*/g, '' );

	// Split at insertion point
	const parts = base.split( '\x02' ).map( ( s ) => String( s || '' ).trim() );
	if ( parts.length === 2 ) {
		return ( parts[ 0 ] + '\n' + bannersBlock + '\n' + parts[ 1 ] ).trim();
	}

	// No explicit insertion point found; ensure no control chars leak
	base = base.replace( /\x02/g, '' );

	// If redirect or content is only templates, append at end; else prepend
	let nonTemplateContent = base;
	( talkTemplates || [] ).forEach( ( template ) => {
		try {
			nonTemplateContent = nonTemplateContent.replace( template.wikitext, '' );
		} catch ( _e ) { /* ignore */ }
	} );
	if ( /^#REDIRECT/i.test( base ) || !String( nonTemplateContent || '' ).trim() ) {
		return ( base.trim() + '\n' + bannersBlock ).trim();
	}
	return ( bannersBlock + '\n' + base.trim() ).trim();
};

export { applyBannerInsert };
// </nowiki>
