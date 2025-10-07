import API from '@services/api.js';
// <nowiki>

const fetchTalkWikitext = function ( talkTitle ) {
	return API.get( {
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		rvsection: '0',
		titles: talkTitle,
		indexpageids: 1
	} ).then( ( result ) => {
		const id = result.query.pageids;
		const wikitext = ( id < 0 ) ? '' : result.query.pages[ id ].revisions[ 0 ][ '*' ];
		return wikitext;
	} );
};

const fetchLatestRevId = function ( subjectTitle ) {
	return API.get( {
		action: 'query',
		format: 'json',
		prop: 'revisions',
		titles: subjectTitle,
		rvprop: 'ids',
		indexpageids: 1
	} ).then( ( result ) => {
		if ( result.query.redirects ) {
			return false;
		}
		const id = result.query.pageids;
		const page = result.query.pages[ id ];
		if ( page.missing === '' ) {
			return false;
		}
		if ( id < 0 ) {
			return $.Deferred().reject();
		}
		return page.revisions[ 0 ].revid;
	} );
};

export { fetchTalkWikitext, fetchLatestRevId };
// </nowiki>
