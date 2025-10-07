// <nowiki>

// Build edit summary string based on provided banner changes and overall ratings
// Params:
// - removed: string[] of removed banner display names
// - edited: string[] of edited banner display names (with rating suffixes where applicable)
// - added: string[] of added banner display names (with rating suffixes where applicable)
// - overallClass: string|null
// - overallImportance: string|null
// - advert: string (suffix from config)
// Returns: string summary
const buildEditSummary = function ( params ) {
	const removed = ( params && params.removed ) || [];
	const edited = ( params && params.edited ) || [];
	const added = ( params && params.added ) || [];
	const overallClass = ( params && params.overallClass ) || null;
	const overallImportance = ( params && params.overallImportance ) || null;
	const advert = ( params && params.advert ) || '';

	let overall = '';
	if ( overallClass && overallImportance ) {
		overall = ' (' + overallClass + '/' + overallImportance + ')';
	} else if ( overallClass ) {
		overall = ' (' + overallClass + ')';
	} else if ( overallImportance ) {
		overall = ' (' + overallImportance + ')';
	}

	const body = [ ...edited, ...added, ...removed ].join( ', ' );
	return `Assessment${ overall }: ${ body }${ advert }`;
};

export { buildEditSummary };
// </nowiki>
