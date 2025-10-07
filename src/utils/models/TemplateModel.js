// <nowiki>
import { normalizeTemplateTitle, addNamespacePrefix } from '@utils/wikitext.js';

// Core Template model: structure only; no TemplateData, redirects, shell or ratings
const Template = function ( wikitext ) {
	this.wikitext = wikitext;
	this.parameters = [];
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

Template.prototype.getParam = function ( paramName ) {
	return this.parameters.find( ( p ) => p.name === paramName );
};

Template.prototype.setName = function ( name ) {
	this.name = String( name || '' ).trim();
};

Template.prototype.getTitle = function () {
	const prefixed = addNamespacePrefix( normalizeTemplateTitle( this.name ) );
	return mw.Title.newFromText( prefixed );
};

// Read TemplateData property for a specific parameter name
// Example: getDataForParam('suggestedvalues', 'importance')
Template.prototype.getDataForParam = function ( propertyKey, paramName ) {
	if ( !this || !this.paramData ) {
		return null;
	}
	const key = String( propertyKey || '' );
	const name = String( paramName || '' );
	const data = this.paramData[ name ];
	if ( !data ) {
		return null;
	}
	// Try common casings used across TemplateData payloads
	return data[ key ] ||
		data[ key.toLowerCase() ] ||
		data[ key.toUpperCase() ] ||
		data[ key.charAt( 0 ).toLowerCase() + key.slice( 1 ) ] ||
		data[ key.charAt( 0 ).toUpperCase() + key.slice( 1 ) ] ||
		null;
};

export { Template };
// </nowiki>
