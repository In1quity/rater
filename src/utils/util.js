// <nowiki>

// Various utility functions and objects that might be used in multiple places

const isAfterDate = function ( dateString ) {
	return new Date( dateString ) < new Date();
};

const yesWords = [
	'add',
	'added',
	'affirm',
	'affirmed',
	'include',
	'included',
	'on',
	'true',
	'yes',
	'y',
	'1'
];
const noWords = [
	'decline',
	'declined',
	'exclude',
	'excluded',
	'false',
	'none',
	'not',
	'no',
	'n',
	'off',
	'omit',
	'omitted',
	'remove',
	'removed',
	'0'
];
const normaliseYesNo = function ( val ) {
	if ( val === null || typeof val === 'undefined' ) {
		return val;
	}
	const trimmedLcVal = val.trim().toLowerCase();
	if ( yesWords.includes( trimmedLcVal ) ) {
		return 'yes';
	} else if ( noWords.includes( trimmedLcVal ) ) {
		return 'no';
	} else {
		return trimmedLcVal;
	}
};

/**
 *
 * @param {Array} array
 * @param {Function} filterPredicate (currentVal, currentIndex, array) => {boolean}
 * @param {Function} mapTransform (currentVal, currentIndex, array) => {any}
 * @returns {Array}
 */
const filterAndMap = function ( array, filterPredicate, mapTransform ) {
	return array.reduce(
		( accumulated, currentVal, currentIndex ) => {
			if ( filterPredicate( currentVal, currentIndex, array ) ) {
				return [ ...accumulated, mapTransform( currentVal, currentIndex, array ) ];
			}
			return accumulated;
		},
		[]
	);
};

// Remove internal control characters before displaying in UI or saving
const sanitizeControlChars = function ( text ) {
	if ( text === null || typeof text === 'undefined' ) {
		return text;
	}
	return String( text ).replace( /[\x01\x02]/g, '' );
};

/**
 *
 * @param {string[]|number[]} array
 * @returns {string|null} item with the highest frequency
 * e.g. `mostFrequent(["apple", "apple", "orange"])` returns `"apple"`
 */
function mostFrequent( array ) {
	if ( !array || !Array.isArray( array ) || array.length === 0 ) {
		return null;
	}
	const map = {};
	let mostFreq = null;
	array.forEach( ( item ) => {
		map[ item ] = ( map[ item ] || 0 ) + 1;
		if ( mostFreq === null || map[ item ] > map[ mostFreq ] ) {
			mostFreq = item;
		}
	} );
	return mostFreq;
}

/**
 *
 * @param {string[]|number[]} array
 * @returns {string[]|number[]} array with only unique values
 * e.g. `uniqueArray(["apple", "apple", "orange"])` returns `["apple", "orange"]`
 */
function uniqueArray( array ) {
	if ( !array || !Array.isArray( array ) || array.length === 0 ) {
		return [];
	}
	const seen = {};
	const unique = [];
	array.forEach( ( item ) => {
		if ( !seen[ item ] ) {
			unique.push( item );
			seen[ item ] = true;
		}
	} );
	return unique;
}

function classMask( classVal ) {
	if ( !classVal ) {
		return classVal;
	}
	switch ( classVal.toLowerCase() ) {
		case 'fa':
		case 'fl':
		case 'a':
		case 'ga':
		case 'b':
		case 'c':
		case 'na':
		case 'fm':
		case 'al':
		case 'bl':
		case 'cl':
			return classVal.toUpperCase();
		case 'start':
		case 'stub':
		case 'list':
		case 'portal':
		case 'project':
		case 'draft':
		case 'book':
		case 'future':
		case 'current':
		case 'complete':
		case 'substantial':
		case 'basic':
		case 'incomplete':
		case 'meta':
			return classVal.slice( 0, 1 ).toUpperCase() + classVal.slice( 1 ).toLowerCase();
		case 'image':
		case 'img':
		case 'file':
			return 'File';
		case 'category':
		case 'cat':
		case 'categ':
			return 'Category';
		case 'disambiguation':
		case 'disambig':
		case 'disamb':
		case 'dab':
			return 'Disambig';
		case 'redirect':
		case 'redir':
		case 'red':
			return 'Redirect';
		case 'template':
		case 'temp':
		case 'tpl':
			return 'Template';
		case 'bplus':
		case 'b+':
			return 'Bplus';
		case 'fpo':
			return 'FPo';
		default:
			return classVal;
	}
}

function importanceMask( importance ) {
	if ( !importance ) {
		return importance;
	}
	if ( importance.toLowerCase() === 'na' ) {
		return 'NA';
	}
	return importance.slice( 0, 1 ).toUpperCase() + importance.slice( 1 ).toLowerCase();
}

// String utilities
const strReplaceAt = function ( string, index, char ) {
	return string.slice( 0, index ) + char + string.slice( index + 1 );
};

const normalizeString = function ( value ) {
	return String( value === null || typeof value === 'undefined' ? '' : value );
};

const findTopLevelDelimiter = function ( text, delimiter, openChar = '{', closeChar = '}' ) {
	const s = normalizeString( text );
	let depth = 0;
	for ( let i = 0; i < s.length; i++ ) {
		const ch = s[ i ];
		const next = s[ i + 1 ];
		if ( ch === openChar && next === openChar ) {
			depth += 2;
			i++;
			continue;
		}
		if ( ch === closeChar && next === closeChar ) {
			depth -= 2;
			i++;
			continue;
		}
		if ( ch === delimiter && depth === 0 ) {
			return i;
		}
	}
	return -1;
};

export {
	isAfterDate,
	filterAndMap,
	normaliseYesNo,
	mostFrequent,
	uniqueArray,
	classMask,
	importanceMask,
	strReplaceAt,
	normalizeString,
	findTopLevelDelimiter
};
// </nowiki>
