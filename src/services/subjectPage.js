import API from '@services/api.js';
// <nowiki>

// Check subject page features (redirect, disambig, stub, GA/FA/FL, list)
const checkSubjectFeatures = function ( subjectPrefixedTitle, subjectIsArticle, categoriesConfig ) {
	return API.get( {
		action: 'query',
		format: 'json',
		formatversion: '2',
		prop: 'categories',
		titles: subjectPrefixedTitle,
		redirects: 1,
		clcategories: Object.values( categoriesConfig )
	} ).then( ( response ) => {
		if ( !response || !response.query || !response.query.pages ) {
			return null;
		}
		const redirectTarget = response.query.redirects && response.query.redirects[ 0 ].to || false;
		if ( redirectTarget || !subjectIsArticle ) {
			return { redirectTarget };
		}
		const page = response.query.pages[ 0 ];
		const hasCategory = ( category ) => page.categories && page.categories.find( ( cat ) => cat.title === category );
		return {
			redirectTarget,
			disambig: hasCategory( categoriesConfig.disambig ),
			stubtag: hasCategory( categoriesConfig.stub ),
			isGA: hasCategory( categoriesConfig.goodArticle ),
			isFA: hasCategory( categoriesConfig.featuredArticle ),
			isFL: hasCategory( categoriesConfig.featuredList )
		};
	} ).catch( () => null );
};

export { checkSubjectFeatures };
// </nowiki>
