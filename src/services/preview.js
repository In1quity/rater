import API from '@services/api.js';
// <nowiki>

const parsePreview = function ( params ) {
	const talkWikitext = String( params && params.talkWikitext || '' );
	const summary = String( params && params.summary || '' );
	const title = String( params && params.title || '' );
	return API.post( {
		action: 'parse',
		contentmodel: 'wikitext',
		text: talkWikitext + '\n<hr>\n\'\'\'' + params.label + '\'\'\' ' + summary,
		title: title,
		pst: 1
	} );
};

const compareDiff = function ( params ) {
	const fromText = String( params && params.fromText || '' );
	const toText = String( params && params.toText || '' );
	const title = String( params && params.title || '' );
	return API.post( {
		action: 'compare',
		format: 'json',
		fromtext: fromText,
		fromcontentmodel: 'wikitext',
		totext: toText,
		tocontentmodel: 'wikitext',
		prop: 'diff',
		title: title
	} );
};

export { parsePreview, compareDiff };
// </nowiki>
