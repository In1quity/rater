import API from '@services/api.js';
import config from '@constants/config.js';
import { stripAnyTemplateNs } from '@utils/wikitext.js';
import { getTemplateAliases } from '@utils/aliases.js';
// <nowiki>

let cachedShellAliases = null;

// Shell aliases source: reuse aliases service to avoid duplication
const getShellTemplateAliases = function () {
	if ( cachedShellAliases ) {
		return $.Deferred().resolve( cachedShellAliases ).promise();
	}
	return getTemplateAliases( config.shellTemplate ).then( ( list ) => {
		cachedShellAliases = Array.isArray( list ) && list.length ? list : [ stripAnyTemplateNs( config.shellTemplate ) ];
		return cachedShellAliases;
	} ).catch( () => [ stripAnyTemplateNs( config.shellTemplate ) ] );
};

const getShellTemplateAliasesSync = function () {
	if ( Array.isArray( cachedShellAliases ) && cachedShellAliases.length ) {
		return cachedShellAliases.slice();
	}
	return [ stripAnyTemplateNs( config.shellTemplate ) ];
};

const normalizeNs = ( name ) => stripAnyTemplateNs( name );

const isShellTemplate = function ( template ) {
	const mainText = template.redirectTarget ? template.redirectTarget.getMainText() : template.getTitle().getMainText();
	const normalizedMain = normalizeNs( mainText );
	const normalizedTarget = normalizeNs( config.shellTemplate );
	if ( normalizedMain === normalizedTarget ) {
		return true;
	}
	const localAliases = ( Array.isArray( cachedShellAliases ) && cachedShellAliases.length ) ? cachedShellAliases : getShellTemplateAliasesSync();
	const aliasMatch = Array.isArray( localAliases ) && localAliases.some( ( name ) => normalizeNs( name ) === normalizedMain );
	if ( aliasMatch ) {
		return true;
	}
	try {
		getShellTemplateAliases().then( ( list ) => {
			cachedShellAliases = list || [];
		} );
	} catch ( _e ) {}
	return false;
};

export { isShellTemplate, getShellTemplateAliases, getShellTemplateAliasesSync };
// </nowiki>
