// <nowiki>
import { parseTemplates } from '@utils/parseTemplates.js';
import logger from '@services/logger.js';
import { getShellTemplateAliasesSync } from '@services/templateShell.js';
import { buildOpenRegexFor } from '@utils/wikitext.js';
import config from '@constants/config.js';

const log = logger.get( 'wikitext-apply' );

const findShellRange = function ( lines, candidateNames ) {
	const nsAliases = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
	const tryFind = function ( names ) {
		const openRe = buildOpenRegexFor( names, nsAliases );
		let start = -1;
		let end = -1;
		for ( let i = 0; i < lines.length; i++ ) {
			const t = ( lines[ i ] || '' ).trim();
			if ( start === -1 && openRe && openRe.test( t ) ) {
				start = i;
				continue;
			}
			if ( start !== -1 && t === '}}' ) {
				end = i;
				break;
			}
		}
		return ( start !== -1 && end !== -1 ) ? { start: start, end: end } : null;
	};
	// First by known aliases (from service)
	const byAliases = tryFind( getShellTemplateAliasesSync() );
	if ( byAliases ) {
		return byAliases;
	}
	// Then by candidates from existing banners (UI)
	if ( Array.isArray( candidateNames ) && candidateNames.length ) {
		const byCandidates = tryFind( candidateNames );
		if ( byCandidates ) {
			return byCandidates;
		}
	}
	return null;
};

const normalizeBlock = function ( text ) {
	return String( text || '' )
		.replace( /\s+$/gm, '' )
		.replace( /\n{3,}/g, '\n\n' )
		.trim();
};

// Locale-agnostic top insert: skip empty lines and any non-banner, non-shell template blocks
const findTopInsertIndex = function ( lines, existingBannerNames ) {
	const nsAliases = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
	const shellOpen = buildOpenRegexFor( getShellTemplateAliasesSync(), nsAliases );
	const bannerOpen = Array.isArray( existingBannerNames ) && existingBannerNames.length ? buildOpenRegexFor( existingBannerNames, nsAliases ) : null;
	let i = 0;
	while ( i < lines.length ) {
		const t = ( lines[ i ] || '' ).trim();
		if ( t === '' ) {
			i++;
			continue;
		}
		// Stop if this line starts a shell or a known banner
		if ( ( shellOpen && shellOpen.test( t ) ) || ( bannerOpen && bannerOpen.test( t ) ) ) {
			break;
		}
		// If this line starts some other template block, skip until its closing '}}'
		if ( /^\{\{/.test( t ) ) {
			let j = i + 1;
			let closed = false;
			while ( j < lines.length ) {
				const u = ( lines[ j ] || '' ).trim();
				if ( u === '}}' ) {
					j++;
					closed = true;
					break;
				}
				j++;
			}
			i = closed ? j : i + 1;
			continue;
		}
		break;
	}
	return i;
};

const applyBannerInsert = function ( talkWikitext, bannersWikitext, existingBannerNames ) {
	const bannersBlock = String( bannersWikitext || '' ).trim();
	const base = String( talkWikitext || '' );
	try {
		log.info( '[apply] start: talkLen=%d, bannersLen=%d, existing=%d', base.length, bannersBlock.length, ( existingBannerNames || [] ).length );
	} catch ( _e ) {}
	if ( !base ) {
		return bannersBlock;
	}

	// Split to lines for maintenance-core like operations
	const lines = base.split( '\n' );
	const shellRange = findShellRange( lines, existingBannerNames );

	// When there is a shell, replace inner templates between open and closing '}}'
	if ( shellRange ) {
		try {
			log.info( '[apply] shell block found: %d..%d', shellRange.start, shellRange.end );
			log.debug( '[apply] shell open context: "%s"', ( lines[ shellRange.start ] || '' ).trim() );
		} catch ( _e ) {}
		// Build desired inner block from UI bannersWikitext (remove open and closing)
		const desiredInner = normalizeBlock( bannersBlock.replace( /^\{\{[^|}]+\|?/, '' ).replace( /}}\s*$/, '' ) );
		const currentInner = normalizeBlock( lines.slice( shellRange.start + 1, shellRange.end ).join( '\n' ) );
		if ( desiredInner === currentInner ) {
			try {
				log.info( '[apply] inner unchanged → no-op' );
			} catch ( _e ) {}
			return base;
		}
		// If desired inner is empty while current has content, do not remove implicitly
		if ( !desiredInner && currentInner ) {
			try {
				log.info( '[apply] desired inner empty; preserving existing content → no-op' );
			} catch ( _e ) {}
			return base;
		}
		const innerLines = desiredInner ? desiredInner.split( '\n' ).filter( ( s ) => String( s || '' ).trim() ) : [];
		const deleteCount = shellRange.end - shellRange.start - 1;
		Array.prototype.splice.apply( lines, [ shellRange.start + 1, deleteCount ].concat( innerLines ) );
		try {
			log.info( '[apply] replaced inner with %d line(s)', innerLines.length );
		} catch ( _e ) {}
		return lines.join( '\n' );
	}

	// No shell present: try to insert at first existing banner position
	const nsAliases = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
	const existing = Array.isArray( existingBannerNames ) ? existingBannerNames.slice() : [];
	const existingRe = existing.length ? buildOpenRegexFor( existing, nsAliases ) : null;
	let at = -1;
	if ( existingRe ) {
		for ( let i = 0; i < lines.length; i++ ) {
			const t = ( lines[ i ] || '' ).trim();
			if ( existingRe.test( t ) ) {
				at = i;
				break;
			}
		}
	}
	if ( at === -1 ) {
		at = findTopInsertIndex( lines, existing );
		try {
			log.info( '[apply] no shell found: insert at top index %d', at );
		} catch ( _e ) {}
	} else {
		try {
			log.info( '[apply] insert at first existing banner line %d', at );
		} catch ( _e ) {}
	}
	Array.prototype.splice.apply( lines, [ at, 0 ].concat( [ bannersBlock ] ) );
	return lines.join( '\n' );
};

export { applyBannerInsert };
// </nowiki>
