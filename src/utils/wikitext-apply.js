// <nowiki>
import { parseTemplates } from '@utils/parseTemplates.js';
import logger from '@services/logger.js';
import { getShellTemplateAliasesSync } from '@services/templateShell.js';
import { buildOpenRegexFor, findBlockRange, normalizeBlockText, isShellOpenLine, computeTopInsertIndex, stripAnyTemplateNs, normalizeTemplateName } from '@utils/wikitext.js';
import config from '@constants/config.js';

const log = logger.get( 'wikitext-apply' );

const findShellRange = function ( lines, candidateNames ) {
	const nsAliases = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
	const tryFind = function ( names ) {
		const list = ( Array.isArray( names ) ? names : [ names ] )
			.map( ( n ) => normalizeTemplateName( stripAnyTemplateNs( n ) ) );
		const openRe = buildOpenRegexFor( list, nsAliases );
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

	// When there is a shell
	if ( shellRange ) {
		try {
			log.info( '[apply] shell block found: %d..%d', shellRange.start, shellRange.end );
			log.debug( '[apply] shell open context: "%s"', ( lines[ shellRange.start ] || '' ).trim() );
		} catch ( _e ) {}

		// Decide whether desired block is a shell or plain banners list
		const nsAliasesLocal = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
		const desiredStartsWithShell = isShellOpenLine( ( bannersBlock.split( '\n' )[ 0 ] || '' ), nsAliasesLocal, getShellTemplateAliasesSync() );

		if ( desiredStartsWithShell ) {
			// Replace inner templates between open and closing '}}'
			const desiredInner = normalizeBlockText( bannersBlock.replace( /^\{\{[^|}]+\|?/, '' ).replace( /}}\s*$/, '' ) );
			const currentInner = normalizeBlockText( lines.slice( shellRange.start + 1, shellRange.end ).join( '\n' ) );
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

		// Desired block is not a shell → remove shell entirely and insert banners as-is
		const replacementLines = bannersBlock ? bannersBlock.split( '\n' ) : [];
		const deleteCountWhole = shellRange.end - shellRange.start + 1;
		Array.prototype.splice.apply( lines, [ shellRange.start, deleteCountWhole ].concat( replacementLines ) );
		try {
			log.info( '[apply] removed shell and inserted %d line(s)', replacementLines.length );
		} catch ( _e ) {}
		return lines.join( '\n' );
	}

	// No shell present: optionally remove existing top-level banners and insert
	const nsAliases = Array.isArray( config.templateNamespaceAliases ) ? config.templateNamespaceAliases : [];
	let existing = Array.isArray( existingBannerNames ) ? existingBannerNames.slice() : [];
	let existingRe = existing.length ? buildOpenRegexFor( existing, nsAliases ) : null;
	// Determine if desired block is a shell by extracting the template name and matching aliases
	const desiredIsShell = isShellOpenLine( ( bannersBlock.split( '\n' )[ 0 ] || '' ), nsAliases, getShellTemplateAliasesSync() );
	if ( desiredIsShell && existingRe ) {
		const openRe = buildOpenRegexFor( existing, nsAliases );
		let idx = 0;
		while ( idx < lines.length ) {
			const range = findBlockRange( lines, idx, lines.length, openRe );
			if ( !range ) {
				break;
			}
			const deleteCount = ( range.end - range.start ) + 1;
			lines.splice( range.start, deleteCount );
			idx = range.start; // continue after removed block
		}
		try {
			log.info( '[apply] removed existing top-level banners before shell insert' );
		} catch ( _e ) {}
		// After removal, avoid using existing banner position for insertion
		existing = [];
		existingRe = null;
	}
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
		at = computeTopInsertIndex( lines, existing, getShellTemplateAliasesSync(), nsAliases );
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
