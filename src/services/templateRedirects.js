import API from '@services/api.js';
import { filterAndMap } from '@utils/util.js';
// <nowiki>

// Resolve redirects for Template instances; returns same instances with redirectTarget set
const getWithRedirectTo = function ( templates ) {
	const templatesArray = Array.isArray( templates ) ? templates : [ templates ];
	if ( templatesArray.length === 0 ) {
		return $.Deferred().resolve( [] );
	}

	const titles = filterAndMap( templatesArray,
		( template ) => template.getTitle() !== null,
		( template ) => template.getTitle().getPrefixedText()
	);

	return API.get( {
		action: 'query',
		format: 'json',
		titles: titles,
		redirects: 1
	} ).then( ( result ) => {
		if ( !result || !result.query ) {
			return $.Deferred().reject( 'Empty response' );
		}
		if ( result.query.redirects ) {
			result.query.redirects.forEach( ( redirect ) => {
				const i = templatesArray.findIndex( ( template ) => {
					const title = template.getTitle();
					return title && title.getPrefixedText() === redirect.from;
				} );
				if ( i !== -1 ) {
					templatesArray[ i ].redirectTarget = mw.Title.newFromText( redirect.to );
				}
			} );
		}
		return Array.isArray( templates ) ? templatesArray : templatesArray[ 0 ];
	} );
};

export { getWithRedirectTo };
// Backward-compatible alias and helpers
const resolveRedirects = getWithRedirectTo;
const getCanonicalName = function ( template ) {
	if ( !template || !template.getTitle ) {
		return '';
	}
	return template.redirectTarget ? template.redirectTarget.getMainText() : template.getTitle().getMainText();
};

export { resolveRedirects, getCanonicalName };
// </nowiki>
