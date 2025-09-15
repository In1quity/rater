import API, { makeErrorMsg } from './api';
import { isAfterDate } from './util';
import * as cache from './cache';
// <nowiki>

const cacheBanners = function ( banners ) {
	cache.write( 'banners', banners, 2, 60 );
};

/**
 * Gets banners/options from the Api
 *
 * @returns {Promise} Resolved with: banners object, bannerOptions array
 */
const getListOfBannersFromApi = function () {

	const finishedPromise = $.Deferred();

	const querySkeleton = {
		action: 'query',
		format: 'json',
		list: 'categorymembers',
		cmprop: 'title',
		cmnamespace: '10',
		cmlimit: '500'
	};

	const categories = [
		{
			title: 'Category:WikiProject banners with quality assessment',
			abbreviation: 'withRatings',
			banners: [],
			processed: $.Deferred()
		},
		{
			title: 'Category:WikiProject banners without quality assessment',
			abbreviation: 'withoutRatings',
			banners: [],
			processed: $.Deferred()
		},
		{
			title: 'Category:WikiProject banner wrapper templates',
			abbreviation: 'wrappers',
			banners: [],
			processed: $.Deferred()
		},
		{
			title: 'Category:WikiProject banner templates not based on WPBannerMeta',
			abbreviation: 'notWPBM',
			banners: [],
			processed: $.Deferred()
		},
		{
			title: 'Category:Inactive WikiProject banners',
			abbreviation: 'inactive',
			banners: [],
			processed: $.Deferred()
		},
		{
			title: 'Category:Wrapper templates for WikiProject Women in Red',
			abbreviation: 'wir',
			banners: [],
			processed: $.Deferred()
		}
	];

	const processQuery = function ( result, catIndex ) {
		if ( !result.query || !result.query.categorymembers ) {
			// No results
			// TODO: error or warning ********
			finishedPromise.reject();
			return;
		}

		// Gather titles into array - excluding "Template:" prefix
		const resultTitles = result.query.categorymembers.map( ( info ) => info.title.slice( 9 ) );
		Array.prototype.push.apply( categories[ catIndex ].banners, resultTitles );

		// Continue query if needed
		if ( result.continue ) {
			doApiQuery( $.extend( categories[ catIndex ].query, result.continue ), catIndex );
			return;
		}

		categories[ catIndex ].processed.resolve();
	};

	var doApiQuery = function ( q, catIndex ) {
		API.get( q )
			.done( ( result ) => {
				processQuery( result, catIndex );
			} )
			.fail( ( code, jqxhr ) => {
				console.warn( '[Rater] ' + makeErrorMsg( code, jqxhr, 'Could not retrieve pages from [[:' + q.cmtitle + ']]' ) );
				finishedPromise.reject();
			} );
	};

	categories.forEach( ( cat, index, arr ) => {
		cat.query = $.extend( { cmtitle: cat.title }, querySkeleton );
		$.when( arr[ index - 1 ] && arr[ index - 1 ].processed || true ).then( () => {
			doApiQuery( cat.query, index );
		} );
	} );

	categories[ categories.length - 1 ].processed.then( () => {
		const banners = {};
		categories.forEach( ( catObject ) => {
			banners[ catObject.abbreviation ] = catObject.banners;
		} );

		finishedPromise.resolve( banners );
	} );

	return finishedPromise;
};

/**
 * Gets banners from cache, if there and not too old
 *
 * @returns {Promise} Resolved with banners object
 */
const getBannersFromCache = function () {
	const cachedBanners = cache.read( 'banners' );
	if (
		!cachedBanners ||
		!cachedBanners.value ||
		!cachedBanners.staleDate
	) {
		return $.Deferred().reject();
	}
	if ( isAfterDate( cachedBanners.staleDate ) ) {
		// Update in the background; still use old list until then
		getListOfBannersFromApi().then( cacheBanners );
	}
	return $.Deferred().resolve( cachedBanners.value );
};

/**
 * Gets banner names, grouped by type (withRatings, withoutRatings, wrappers, notWPBM)
 * @returns {Promise<Object>} Object of string arrays keyed by type (withRatings, withoutRatings, wrappers, notWPBM)
 */
const getBannerNames = () => getBannersFromCache()
	.then( ( banners ) => {
		// Ensure all keys exist
		if ( !banners.withRatings || !banners.withoutRatings || !banners.wrappers || !banners.notWPBM || !banners.inactive || !banners.wir ) {
			getListOfBannersFromApi().then( cacheBanners );
			return $.extend(
				{ withRatings: [], withoutRatings: [], wrappers: [], notWPBM: [], inactive: [], wir: [] },
				banners
			);
		}
		// Success: pass through
		return banners;
	} )
	.catch( () => {
		// Failure: get from Api, then cache them
		const bannersPromise = getListOfBannersFromApi();
		bannersPromise.then( cacheBanners );
		return bannersPromise;
	} );

export { getBannerNames };
// </nowiki>
