import API from '@services/api.js';
import { getShellTemplateAliases, getShellTemplateAliasesSync } from '@constants/config.js';
import { isAfterDate, mostFrequent, filterAndMap } from './util.js';
import config from '@constants/config.js';
import * as cache from '@services/cache.js';
// <nowiki>

// Debug logger (enable via window.RATER_DEBUG)
const tdLog = function () {
	try {
		if ( window && window.RATER_DEBUG ) {
			const args = Array.prototype.slice.call( arguments );
			args.unshift( '[Rater][TD]' );
			console.log.apply( console, args );
		}
	} catch ( e ) { /* ignore */ }
};

/** Template
 *
 * @class
 * Represents the wikitext of template transclusion. Used by #parseTemplates.
 * @prop {String} name Name of the template
 * @prop {String} wikitext Full wikitext of the transclusion
 * @prop {Object[]} parameters Parameters used in the translcusion, in order, of form:
	{
		name: {String|Number} parameter name, or position for unnamed parameters,
		value: {String} Wikitext passed to the parameter (whitespace trimmed),
		wikitext: {String} Full wikitext (including leading pipe, parameter name/equals sign (if applicable), value, and any whitespace)
	}
 * @constructor
 * @param {String} wikitext Wikitext of a template transclusion, starting with '{{' and ending with '}}'.
 */
const Template = function ( wikitext ) {
	this.wikitext = wikitext;
	this.parameters = [];
	// Spacing around pipes, equals signs, end braces (defaults)
	this.pipeStyle = ' |';
	this.equalsStyle = '=';
	this.endBracesStyle = '}}';
};
Template.prototype.addParam = function ( name, val, wikitext ) {
	this.parameters.push( {
		name: name,
		value: val,
		wikitext: '|' + wikitext
	} );
};
/**
 * Get a parameter data by parameter name
 */
Template.prototype.getParam = function ( paramName ) {
	return this.parameters.find( ( p ) => p.name === paramName );
};
Template.prototype.setName = function ( name ) {
	this.name = name.trim();
};
Template.prototype.getTitle = function () {
	return mw.Title.newFromText( 'Template:' + this.name );
};

/**
 * parseTemplates
 *
 * Parses templates from wikitext.
 * Based on SD0001's version at <https://en.wikipedia.org/wiki/User:SD0001/parseAllTemplates.js>.
 * Returns an array containing the template details:
 *  var templates = parseTemplates("Hello {{foo |Bar|baz=qux |2=loremipsum|3=}} world");
 *  console.log(templates[0]); // --> object
	{
		name: "foo",
		wikitext:"{{foo |Bar|baz=qux | 2 = loremipsum  |3=}}",
		parameters: [
			{
				name: 1,
				value: 'Bar',
				wikitext: '|Bar'
			},
			{
				name: 'baz',
				value: 'qux',
				wikitext: '|baz=qux '
			},
			{
				name: '2',
				value: 'loremipsum',
				wikitext: '| 2 = loremipsum  '
			},
			{
				name: '3',
				value: '',
				wikitext: '|3='
			}
		],
		getParam: function(paramName) {
			return this.parameters.find(function(p) { return p.name == paramName; });
		}
	}
 *
 *
 * @param {String} wikitext
 * @param {Boolean} recursive Set to `true` to also parse templates that occur within other templates,
 *  rather than just top-level templates.
 * @return {Template[]} templates
*/
const parseTemplates = function ( wikitext, recursive ) {
	if ( !wikitext ) {
		return [];
	}
	const strReplaceAt = function ( string, index, char ) {
		return string.slice( 0, index ) + char + string.slice( index + 1 );
	};

	const result = [];

	const processTemplateText = function ( sIdx, eIdx ) {
		let text = wikitext.slice( sIdx, eIdx );

		const template = new Template( '{{' + text.replace( /\x01/g, '|' ) + '}}' );

		// swap out pipe in links with \x01 control character
		// [[File: ]] can have multiple pipes, so might need multiple passes
		while ( /(\[\[[^\]]*?)\|(.*?\]\])/g.test( text ) ) {
			text = text.replace( /(\[\[[^\]]*?)\|(.*?\]\])/g, '$1\x01$2' );
		}

		// Figure out most-used spacing styles for pipes/equals
		template.pipeStyle = mostFrequent( text.match( /[\s\n]*\|[\s\n]*/g ) ) || ' |';
		template.equalsStyle = mostFrequent( text.replace( /(=[^|]*)=+/g, '$1' ).match( /[\s\n]*=[\s\n]*/g ) ) || '=';
		// Figure out end-braces style
		const endSpacing = text.match( /[\s\n]*$/ );
		template.endBracesStyle = ( endSpacing ? endSpacing[ 0 ] : '' ) + '}}';

		// change '\x01' control characters back to pipes
		const chunks = text.split( '|' ).map( ( chunk ) => chunk.replace( /\x01/g, '|' ) );

		template.setName( chunks[ 0 ] );

		const parameterChunks = chunks.slice( 1 );

		let unnamedIdx = 1;
		parameterChunks.forEach( ( chunk ) => {
			const indexOfEqualTo = chunk.indexOf( '=' );
			const indexOfOpenBraces = chunk.indexOf( '{{' );

			const isWithoutEquals = !chunk.includes( '=' );
			const hasBracesBeforeEquals = chunk.includes( '{{' ) && indexOfOpenBraces < indexOfEqualTo;
			const isUnnamedParam = ( isWithoutEquals || hasBracesBeforeEquals );

			let pName, pNum, pVal;
			if ( isUnnamedParam ) {
				// Get the next number not already used by either an unnamed parameter, or by a
				// named parameter like `|1=val`
				while ( template.getParam( unnamedIdx ) ) {
					unnamedIdx++;
				}
				pNum = unnamedIdx;
				pVal = chunk.trim();
			} else {
				pName = chunk.slice( 0, indexOfEqualTo ).trim();
				pVal = chunk.slice( indexOfEqualTo + 1 ).trim();
			}
			template.addParam( pName || pNum, pVal, chunk );
		} );

		result.push( template );
	};

	const n = wikitext.length;

	// number of unclosed braces
	let numUnclosed = 0;

	// are we inside a comment, or between nowiki tags, or in a {{{parameter}}}?
	let inComment = false;
	let inNowiki = false;
	let inParameter = false;

	let startIndex, endIndex;

	for ( let i = 0; i < n; i++ ) {

		if ( !inComment && !inNowiki && !inParameter ) {

			if ( wikitext[ i ] === '{' && wikitext[ i + 1 ] === '{' && wikitext[ i + 2 ] === '{' && wikitext[ i + 3 ] !== '{' ) {
				inParameter = true;
				i += 2;
			} else if ( wikitext[ i ] === '{' && wikitext[ i + 1 ] === '{' ) {
				if ( numUnclosed === 0 ) {
					startIndex = i + 2;
				}
				numUnclosed += 2;
				i++;
			} else if ( wikitext[ i ] === '}' && wikitext[ i + 1 ] === '}' ) {
				if ( numUnclosed === 2 ) {
					endIndex = i;
					processTemplateText( startIndex, endIndex );
				}
				numUnclosed -= 2;
				i++;
			} else if ( wikitext[ i ] === '|' && numUnclosed > 2 ) {
				// swap out pipes in nested templates with \x01 character
				wikitext = strReplaceAt( wikitext, i, '\x01' );
			} else if ( /^<!--/.test( wikitext.slice( i, i + 4 ) ) ) {
				inComment = true;
				i += 3;
			} else if ( /^<nowiki ?>/.test( wikitext.slice( i, i + 9 ) ) ) {
				inNowiki = true;
				i += 7;
			}

		} else { // we are in a comment or nowiki or {{{parameter}}}
			if ( wikitext[ i ] === '|' ) {
				// swap out pipes with \x01 character
				wikitext = strReplaceAt( wikitext, i, '\x01' );
			} else if ( /^-->/.test( wikitext.slice( i, i + 3 ) ) ) {
				inComment = false;
				i += 2;
			} else if ( /^<\/nowiki ?>/.test( wikitext.slice( i, i + 10 ) ) ) {
				inNowiki = false;
				i += 8;
			} else if ( wikitext[ i ] === '}' && wikitext[ i + 1 ] === '}' && wikitext[ i + 2 ] === '}' ) {
				inParameter = false;
				i += 2;
			}
		}

	}

	if ( recursive ) {
		const subtemplates = filterAndMap( result,
			( template ) => /\{\{(?:.|\n)*\}\}/.test( template.wikitext.slice( 2, -2 ) ),
			( template ) => parseTemplates( template.wikitext.slice( 2, -2 ), true )
		);
		return result.concat.apply( result, subtemplates );
	}

	return result;
};

/**
 * @param {Template|Template[]} templates
 * @return {Promise<Template>|Promise<Template[]>}
 */
const getWithRedirectTo = function ( templates ) {
	const templatesArray = Array.isArray( templates ) ? templates : [ templates ];
	if ( templatesArray.length === 0 ) {
		return $.Deferred().resolve( [] );
	}

	return API.get( {
		action: 'query',
		format: 'json',
		titles: filterAndMap( templatesArray,
			( template ) => template.getTitle() !== null,
			( template ) => template.getTitle().getPrefixedText()
		),
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

Template.prototype.getDataForParam = function ( key, paraName ) {
	if ( !this.paramData ) {
		return null;
	}
	// If alias, switch from alias to preferred parameter name
	const para = this.paramAliases[ paraName ] || paraName;
	if ( !this.paramData[ para ] ) {
		return;
	}

	const data = this.paramData[ para ][ key ];
	// Data might actually be an object with key "en"
	if ( data && data.en && !Array.isArray( data ) ) {
		return data.en;
	}
	return data;
};

// Cache shell template aliases to avoid repeated async lookups
let cachedShellAliases = null;

Template.prototype.isShellTemplate = function () {
	const mainText = this.redirectTarget ?
		this.redirectTarget.getMainText() :
		this.getTitle().getMainText();

	// Normalize to bare template names (strip localized namespace like "Template:" or "Шаблон:")
	const templateNsName = ( config.mw && config.mw.wgFormattedNamespaces && ( config.mw.wgFormattedNamespaces[ 10 ] || 'Template' ) ) || 'Template';
	const nsEscaped = String( templateNsName ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const localizedNsRe = new RegExp( '^' + nsEscaped + ':', 'i' );
	const normalize = ( name ) => String( name || '' )
		.replace( /^Template:/i, '' )
		.replace( localizedNsRe, '' );

	const normalizedMain = normalize( mainText );
	const normalizedTarget = normalize( config.shellTemplate );
	if ( normalizedMain === normalizedTarget ) {
		return true;
	}

	// If aliases already cached (or available sync), check against them
	const localAliases = ( Array.isArray( cachedShellAliases ) && cachedShellAliases.length ) ?
		cachedShellAliases : getShellTemplateAliasesSync();
	if ( Array.isArray( localAliases ) && localAliases.some( ( name ) => normalize( name ) === normalizedMain ) ) {
		return true;
	}

	// Fire-and-forget: warm the cache for subsequent checks
	try {
		getShellTemplateAliases( API ).then( ( list ) => {
			cachedShellAliases = list || [];
		} );
	} catch ( _e ) {
		/* ignore */
	}

	return false;
};

Template.prototype.setParamDataAndSuggestions = function () {
	const self = this;
	const paramDataSet = $.Deferred();

	if ( self.paramData ) {
		return paramDataSet.resolve();
	}

	const prefixedText = self.redirectTarget ?
		self.redirectTarget.getPrefixedText() :
		self.getTitle().getPrefixedText();

	try {
		tdLog( 'load start', prefixedText );
	} catch ( e ) { /* ignore */ }

	const cachedInfo = cache.read( prefixedText + '-params' );

	// helper to compute canonical names using current self.paramData/self.paramAliases
	const computeCanonicalNames = function () {
		const findByNameOrAlias = function ( target ) {
			const lcTarget = String( target || '' ).toLowerCase();
			for ( const key in self.paramData ) {
				if ( Object.prototype.hasOwnProperty.call( self.paramData, key ) ) {
					if ( String( key ).toLowerCase() === lcTarget ) {
						return key;
					}
				}
			}
			for ( const alias in self.paramAliases ) {
				if ( Object.prototype.hasOwnProperty.call( self.paramAliases, alias ) ) {
					if ( String( alias ).toLowerCase() === lcTarget ) {
						return self.paramAliases[ alias ];
					}
				}
			}
			return null;
		};
		let className = findByNameOrAlias( 'class' );
		let importanceName = findByNameOrAlias( 'importance' );
		if ( !className ) {
			const keys = Object.keys( self.paramData || {} );
			className = keys.find( ( k ) => {
				const s = String( k ).toLowerCase();
				return /class|класс|уров/i.test( s );
			} );
		}
		if ( !importanceName ) {
			const keys2 = Object.keys( self.paramData || {} );
			importanceName = keys2.find( ( k ) => {
				const s = String( k ).toLowerCase();
				return /importance|важност/i.test( s );
			} );
		}
		self.classParamName = className || 'class';
		self.importanceParamName = importanceName || 'importance';
		try {
			tdLog( 'canonical keys', { class: self.classParamName, importance: self.importanceParamName } );
		} catch ( e ) { /* ignore */ }
	};

	if (
		cachedInfo &&
		cachedInfo.value &&
		cachedInfo.staleDate &&
		cachedInfo.value.paramData !== null && cachedInfo.value.paramData !== undefined &&
		cachedInfo.value.parameterSuggestions !== null && cachedInfo.value.parameterSuggestions !== undefined &&
		cachedInfo.value.paramAliases !== null && cachedInfo.value.paramAliases !== undefined
	) {
		self.notemplatedata = cachedInfo.value.notemplatedata;
		self.paramData = cachedInfo.value.paramData;
		self.parameterSuggestions = cachedInfo.value.parameterSuggestions;
		self.paramAliases = cachedInfo.value.paramAliases;
		// rebuild aliases from paramData to avoid stale/empty cache
		self.paramAliases = {};
		$.each( self.paramData, ( paraName, paraData ) => {
			if ( paraData && Array.isArray( paraData.aliases ) ) {
				paraData.aliases.forEach( ( alias ) => {
					self.paramAliases[ alias ] = paraName;
				} );
			}
		} );
		computeCanonicalNames();
		try {
			tdLog( 'param keys (cache)', Object.keys( self.paramData ) );
			tdLog( 'aliases (cache)', self.paramAliases );
		} catch ( e ) { /* ignore */ }
		paramDataSet.resolve();
		if ( !isAfterDate( cachedInfo.staleDate ) ) {
			// Just use the cached data
			return paramDataSet;
		} // else: Use the cache data for now, but also fetch new data from API
	}

	API.get( {
		action: 'templatedata',
		titles: prefixedText,
		redirects: 1,
		includeMissingTitles: 1
	} )
		.then(
			( response ) => response,
			( /* error */ ) => null // Ignore errors, will use default data
		)
		.then( ( result ) => {
		// Figure out page id (beacuse action=templatedata doesn't have an indexpageids option)
			const id = result && $.map( result.pages, ( _value, key ) => key );

			if ( !result || !result.pages[ id ] || result.pages[ id ].notemplatedata || !result.pages[ id ].params ) {
			// No TemplateData, so use defaults (guesses)
				self.notemplatedata = true;
				self.templatedataApiError = !result;
				self.paramData = config.defaultParameterData;
			} else {
				self.paramData = result.pages[ id ].params;
			}

			self.paramAliases = {};
			$.each( self.paramData, ( paraName, paraData ) => {
				// Extract aliases for easier reference later on
				if ( paraData.aliases && paraData.aliases.length ) {
					paraData.aliases.forEach( ( alias ) => {
						self.paramAliases[ alias ] = paraName;
					} );
				}
				// Extract allowed values array from description
				if ( paraData.description && /\[.*'.+?'.*?\]/.test( paraData.description.en ) ) {
					try {
						const allowedVals = JSON.parse(
							paraData.description.en
								.replace( /^.*\[/, '[' )
								.replace( /"/g, '\\"' )
								.replace( /'/g, '"' )
								.replace( /,\s*]/, ']' )
								.replace( /].*$/, ']' )
						);
						self.paramData[ paraName ].allowedValues = allowedVals;
					} catch ( e ) {
						console.warn( '[Rater] Could not parse allowed values in description:\n  ' +
					paraData.description.en + '\n Check TemplateData for parameter |' + paraName +
					'= in ' + self.getTitle().getPrefixedText() );
					}
				}
			} );
			computeCanonicalNames();
			try {
				tdLog( 'param keys (api)', Object.keys( self.paramData ) );
				tdLog( 'aliases (api)', self.paramAliases );
			} catch ( e ) { /* ignore */ }

			// Make suggestions for combobox
			const allParamsArray = ( !self.notemplatedata && result.pages[ id ].paramOrder ) ||
			$.map( self.paramData, ( _val, key ) => key );
			self.parameterSuggestions = allParamsArray.filter( ( paramName ) => ( paramName && paramName !== 'class' && paramName !== 'importance' ) )
				.map( ( paramName ) => {
					const optionObject = { data: paramName };
					const label = self.getDataForParam( 'label', paramName );
					if ( label ) {
						optionObject.label = label + ' (|' + paramName + '=)';
					}
					return optionObject;
				} );

			if ( self.templatedataApiError ) {
				// Don't save defaults/guesses to cache;
				return true;
			}

			cache.write( prefixedText + '-params', {
				notemplatedata: self.notemplatedata,
				paramData: self.paramData,
				parameterSuggestions: self.parameterSuggestions,
				paramAliases: self.paramAliases
			}, 1
			);
			return true;
		} )
		.then(
			paramDataSet.resolve,
			paramDataSet.reject
		);

	return paramDataSet;
};

const makeListAs = function ( subjectTitle ) {
	let name = subjectTitle.getMainText().replace( /\s\(.*\)/, '' );
	if ( !name.includes( ' ' ) ) {
		return name;
	}
	let generationalSuffix = '';
	if ( / (?:[JS]r.?|[IVX]+)$/.test( name ) ) {
		generationalSuffix = name.slice( name.lastIndexOf( ' ' ) );
		name = name.slice( 0, name.lastIndexOf( ' ' ) );
		if ( !name.includes( ' ' ) ) {
			return name + generationalSuffix;
		}
	}
	const lastName = name.slice( name.lastIndexOf( ' ' ) + 1 ).replace( /,$/, '' );
	const otherNames = name.slice( 0, name.lastIndexOf( ' ' ) );
	return lastName + ', ' + otherNames + generationalSuffix;
};

Template.prototype.addMissingParams = function () {
	const thisTemplate = this;

	// Autofill listas parameter for WP:BIO
	const isBiographyBanner = this.getTitle().getMainText() === 'WikiProject Biography' ||
		( this.redirectTarget && this.redirectTarget.getMainText() === 'WikiProject Biography' );

	if ( isBiographyBanner && !this.getParam( 'listas' ) ) {
		const subjectTitle = mw.Title.newFromText( config.mw.wgPageName ).getSubjectPage();
		this.parameters.push( {
			name: 'listas',
			value: makeListAs( subjectTitle ),
			autofilled: true
		} );
	}

	// Make sure required/suggested parameters are present
	$.each( thisTemplate.paramData, ( paraName, paraData ) => {
		if ( ( paraData.required || paraData.suggested ) && !thisTemplate.getParam( paraName ) ) {
			// Check if already present in an alias, if any
			if ( paraData.aliases.length ) {
				const aliases = thisTemplate.parameters.filter( ( p ) => {
					const isAlias = paraData.aliases.includes( p.name );
					const isEmpty = !p.value;
					return isAlias && !isEmpty;
				} );
				if ( aliases.length ) {
				// At least one non-empty alias, so do nothing
					return;
				}
			}
			// No non-empty aliases, so add this to the parameters list (with
			// value set parameter to either the autovaule, or as null).
			// Also set that it was autofilled.
			thisTemplate.parameters.push( {
				name: paraName,
				value: paraData.autovalue || null,
				autofilled: true
			} );
		}
	} );

	return thisTemplate;
};

Template.prototype.setClassesAndImportances = function () {
	const parsed = $.Deferred();

	// Don't re-parse if already parsed; no need to parse shell templates or banners without ratings
	if ( this.isShellTemplate() ) {
		this.classes = [ ...config.bannerDefaults.classes ];
		return parsed.resolve();
	} else if ( ( this.classes && this.importances ) || this.withoutRatings ) {
		return parsed.resolve();
	}

	const mainText = this.getTitle().getMainText();

	// Prefer TemplateData-defined values when available
	try {
		tdLog( 'TD param presence', {
			classKey: this.classParamName,
			importanceKey: this.importanceParamName,
			hasClass: !!( this.paramData && this.paramData[ this.classParamName ] ),
			hasImportance: !!( this.paramData && this.paramData[ this.importanceParamName ] )
		} );
	} catch ( e ) { /* ignore */ }

	const tdClasses = ( this.getDataForParam( 'suggestedvalues', this.classParamName ) || this.getDataForParam( 'allowedValues', this.classParamName ) );
	const tdImportances = ( this.getDataForParam( 'suggestedvalues', this.importanceParamName ) || this.getDataForParam( 'allowedValues', this.importanceParamName ) );
	try {
		tdLog( 'TD arrays', {
			classes: Array.isArray( tdClasses ) && tdClasses.length,
			importances: Array.isArray( tdImportances ) && tdImportances.length,
			values: { classes: tdClasses, importances: tdImportances }
		} );
	} catch ( e ) { /* ignore */ }

	if ( Array.isArray( tdClasses ) && tdClasses.length ) {
		this.classes = tdClasses;
	}
	if ( Array.isArray( tdImportances ) && tdImportances.length ) {
		this.importances = tdImportances;
	}
	// If TD declares importance param, but no values list was provided, fall back to defaults
	if ( ( this.paramData && this.paramData[ this.importanceParamName ] ) && ( !Array.isArray( this.importances ) || this.importances.length === 0 ) ) {
		this.importances = config.bannerDefaults.importances.slice();
		try {
			tdLog( 'TD declares importance but no values → defaults', this.importances );
		} catch ( e ) { /* ignore */ }
	}
	// If both are now available, use them and short-circuit further detection
	if ( Array.isArray( this.classes ) && this.classes.length && Array.isArray( this.importances ) && this.importances.length ) {
		try {
			tdLog( 'TD ratings used', { classes: this.classes, importances: this.importances } );
		} catch ( e ) { /* ignore */ }
		cache.write( mainText + '-ratings', { classes: this.classes, importances: this.importances }, 1 );
		return parsed.resolve();
	}

	// Some projects have hardcoded values, to avoid standard classes or to prevent API issues (timeout and/or node count exceeded)
	const redirectTargetOrMainText = this.redirectTarget ? this.redirectTarget.getMainText() : mainText;
	if ( config.customBanners[ redirectTargetOrMainText ] ) {
		this.classes = config.customBanners[ redirectTargetOrMainText ].classes;
		this.importances = config.customBanners[ redirectTargetOrMainText ].importances;
		return parsed.resolve();
	}

	// Otherwise try reading from cached data
	const cachedRatings = cache.read( mainText + '-ratings' );
	if (
		cachedRatings &&
		cachedRatings.value &&
		cachedRatings.staleDate &&
		cachedRatings.value.classes !== null && cachedRatings.value.classes !== undefined &&
		cachedRatings.value.importances !== null && cachedRatings.value.importances !== undefined
	) {
		this.classes = cachedRatings.value.classes;
		this.importances = cachedRatings.value.importances;
		try {
			tdLog( 'ratings cache hit', { classes: this.classes, importances: this.importances } );
		} catch ( e ) { /* ignore */ }
		const cacheHasImportances = Array.isArray( this.importances ) && this.importances.length > 0;
		if ( cacheHasImportances ) {
			parsed.resolve();
			if ( !isAfterDate( cachedRatings.staleDate ) ) {
				return parsed;
			}
		}
	}

	let wikitextToParse = '';
	const selfRef = this;
	config.bannerDefaults.extendedClasses.forEach( ( classname, index ) => {
		const classKey = ( selfRef.classParamName || 'class' );
		const importanceKey = ( selfRef.importanceParamName || 'importance' );
		wikitextToParse += '{{' + mainText + '|' + classKey + '=' + classname + '|' + importanceKey + '=' +
		( config.bannerDefaults.extendedImportances[ index ] || '' ) + '}}\n';
	} );
	try {
		tdLog( 'parse API request', { title: mainText, classKey: this.classParamName, importanceKey: this.importanceParamName, classesTried: config.bannerDefaults.extendedClasses.length, importancesTried: config.bannerDefaults.extendedImportances.length } );
	} catch ( e ) { /* ignore */ }

	return API.get( {
		action: 'parse',
		title: 'Talk:Wikipedia',
		text: wikitextToParse,
		prop: 'categorieshtml'
	} )
		.then( ( result ) => {
			const catsHtml = result.parse.categorieshtml[ '*' ];
			const extendedClasses = config.bannerDefaults.extendedClasses.filter( ( cl ) => catsHtml.includes( cl + '-Class' ) );
			this.classes = [ ...config.bannerDefaults.classes, ...extendedClasses ];
			this.importances = config.bannerDefaults.extendedImportances.filter( ( imp ) => catsHtml.includes( imp + '-importance' ) );
			cache.write( mainText + '-ratings',
				{
					classes: this.classes,
					importances: this.importances
				},
				1
			);
			return true;
		} );
};

export { Template, parseTemplates, getWithRedirectTo };
// </nowiki>
