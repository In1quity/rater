// <nowiki>

// Ensure a banner name has one of allowed prefixes; if none present, optionally prepend the first
// Returns an object: { name, hasValidPrefix, addedPrefix }
const ensureBannerPrefix = function ( name, prefixes ) {
	const raw = String( name || '' ).trim();
	const list = Array.isArray( prefixes ) ? prefixes : [];
	if ( !raw || list.length === 0 ) {
		return { name: raw, hasValidPrefix: false, addedPrefix: '' };
	}
	const hasValidPrefix = list.some( ( p ) => raw.toLowerCase().startsWith( String( p || '' ).toLowerCase() ) );
	if ( hasValidPrefix ) {
		return { name: raw, hasValidPrefix, addedPrefix: '' };
	}
	// Auto-prepend first prefix by convention
	const first = String( list[ 0 ] || '' );
	return { name: first + raw, hasValidPrefix: true, addedPrefix: first };
};

export { ensureBannerPrefix };
// </nowiki>
