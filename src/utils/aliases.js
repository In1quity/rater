// <nowiki>
import API from '@services/api.js';
import config from '@constants/config.js';
import { addNamespacePrefix, stripAnyTemplateNs } from '@utils/wikitext.js';

// Simple in-memory cache: name(lowercased) -> aliases[]
const ALIASES_CACHE = Object.create( null );

const getNamespaceAliases = function () {
	const list = ( config && Array.isArray( config.templateNamespaceAliases ) ) ? config.templateNamespaceAliases.slice() : [ 'Template' ];
	return list.length ? list : [ 'Template' ];
};

// Resolve canonical title and redirects → return array of alias names (namespace-stripped)
const getTemplateAliases = function ( templateName ) {
	const base = String( templateName || '' ).trim();
	if ( !base ) {
		return $.Deferred().resolve( [] );
	}
	const key = base.toLowerCase();
	if ( Object.prototype.hasOwnProperty.call( ALIASES_CACHE, key ) ) {
		return $.Deferred().resolve( ALIASES_CACHE[ key ] );
	}
	const nsAliases = getNamespaceAliases();
	const titled = addNamespacePrefix( base, nsAliases );
	// Step 1: resolve canonical (follow redirects)
	return API.get( { action: 'query', format: 'json', formatversion: 2, redirects: 1, titles: titled } )
		.then( ( data ) => {
			const page = ( data && data.query && data.query.pages && data.query.pages[ 0 ] ) || {};
			let canonical = stripAnyTemplateNs( page.title || base );
			if ( !canonical ) {
				canonical = base;
			}
			// Step 2: get redirects that point to canonical
			const titledCanonical = addNamespacePrefix( canonical, nsAliases );
			return API.get( { action: 'query', format: 'json', formatversion: 2, prop: 'redirects', titles: titledCanonical } )
				.then( ( d2 ) => {
					const p = ( d2 && d2.query && d2.query.pages && d2.query.pages[ 0 ] ) || {};
					const redirects = ( p.redirects || [] ).map( ( r ) => stripAnyTemplateNs( r.title || '' ) ).filter( Boolean );
					const out = [ canonical ].concat( redirects );
					ALIASES_CACHE[ key ] = out;
					return out;
				} );
		} );
};

// Collect alias groups for array of plain names → { name: aliases[] }
const collectAliasesForNames = function ( names ) {
	const list = ( Array.isArray( names ) ? names : [ names ] ).filter( Boolean );
	return $.when.apply( null, list.map( ( n ) => getTemplateAliases( n ) ) )
		.then( function () {
			const map = Object.create( null );
			for ( let i = 0; i < list.length; i++ ) {
				// arguments is array-like of results from getTemplateAliases
				const aliases = arguments[ i ] || [];
				map[ list[ i ] ] = Array.isArray( aliases ) ? aliases : [ list[ i ] ];
			}
			return map;
		} );
};

// Collect aliases for array of template objects { name, code } → { name: aliases[] }
const collectAliasesForTemplates = function ( arr ) {
	const names = ( arr || [] ).map( ( t ) => ( t && t.name ) ).filter( Boolean );
	return collectAliasesForNames( names );
};

export { getTemplateAliases, collectAliasesForNames, collectAliasesForTemplates };
// </nowiki>
