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

export { Template };
// </nowiki>
