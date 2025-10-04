import config from './config';
import i18n from './i18n';
import API from './api';
import { parseTemplates, getWithRedirectTo } from './Template';
import { getBannerNames } from './getBanners';
import * as cache from './cache';
import windowManager from './windowManager';
import { getPrefs } from './prefs';
import { filterAndMap } from './util';
// <nowiki>

const setupRater = function ( clickEvent ) {
	if ( clickEvent ) {
		clickEvent.preventDefault();
	}

	const setupCompletedPromise = $.Deferred();

	const currentPage = mw.Title.newFromText( config.mw.wgPageName );
	const talkPage = currentPage && currentPage.getTalkPage();
	const subjectPage = currentPage && currentPage.getSubjectPage();
	const subjectIsArticle = config.mw.wgNamespaceNumber <= 1;

	// Get preferences (task 0)
	const prefsPromise = getPrefs();

	// Get lists of all banners (task 1)
	const bannersPromise = getBannerNames();

	// Load talk page (task 2)
	const loadTalkPromise = API.get( {
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		rvsection: '0',
		titles: talkPage.getPrefixedText(),
		indexpageids: 1
	} ).then( ( result ) => {
		const id = result.query.pageids;
		const wikitext = ( id < 0 ) ? '' : result.query.pages[ id ].revisions[ 0 ][ '*' ];
		return wikitext;
	} );

	// Parse talk page for banners (task 3)
	const parseTalkPromise = loadTalkPromise.then( ( wikitext ) => parseTemplates( wikitext, true ) ) // Get all templates
		.then( ( templates ) => templates.filter( ( template ) => template.getTitle() !== null ) ) // Filter out invalid templates (e.g. parser functions)
		.then( ( templates ) => getWithRedirectTo( templates ) ) // Check for redirects
		.then( ( templates ) => bannersPromise.then( ( allBanners ) => // Get list of all banner templates
			filterAndMap(
				templates,
				// Filter out non-banners
				( template ) => {
					if ( template.isShellTemplate() ) {
						return true;
					}
					const mainText = template.redirectTarget ?
						template.redirectTarget.getMainText() :
						template.getTitle().getMainText();
					return allBanners.withRatings.includes( mainText ) ||
						allBanners.withoutRatings.includes( mainText ) ||
						allBanners.wrappers.includes( mainText ) ||
						allBanners.notWPBM.includes( mainText ) ||
						allBanners.inactive.includes( mainText ) ||
						allBanners.wir.includes( mainText );
				},
				// Set additional properties if needed
				( template ) => {
					const mainText = template.redirectTarget ?
						template.redirectTarget.getMainText() :
						template.getTitle().getMainText();
					if ( allBanners.wrappers.includes( mainText ) ) {
						template.redirectTarget = mw.Title.newFromText( 'Template:Subst:' + mainText );
					}
					if (
						allBanners.withoutRatings.includes( mainText ) ||
							allBanners.wir.includes( mainText )
					) {
						template.withoutRatings = true;
					}
					if ( allBanners.inactive.includes( mainText ) ) {
						template.inactiveProject = true;
					}
					return template;
				}
			)
		) );

	// Retrieve and store TemplateData first, then classes/importances (task 4)
	const templateDetailsPromise = parseTalkPromise.then( ( templates ) => {
		const perTemplate = templates.map( ( template ) => {
			if ( template.isShellTemplate() ) {
				return $.Deferred().resolve();
			}
			return template.setParamDataAndSuggestions().then( () => template.setClassesAndImportances() );
		} );
		return $.when.apply( null, perTemplate ).then( () => {
			templates.forEach( ( t ) => {
				t.addMissingParams();
			} );
			return templates;
		} );
	} );

	// Check subject page features (task 5) - but don't error out if request fails
	const subjectPageCheckPromise = API.get( {
		action: 'query',
		format: 'json',
		formatversion: '2',
		prop: 'categories',
		titles: subjectPage.getPrefixedText(),
		redirects: 1,
		clcategories: Object.values( config.subjectPageCategories )
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
			disambig: hasCategory( config.subjectPageCategories.disambig ),
			stubtag: hasCategory( config.subjectPageCategories.stub ),
			isGA: hasCategory( config.subjectPageCategories.goodArticle ),
			isFA: hasCategory( config.subjectPageCategories.featuredArticle ),
			isFL: hasCategory( config.subjectPageCategories.featuredList ),
			isList: !hasCategory( config.subjectPageCategories.featuredList ) && /^Lists? of/.test( subjectPage.getPrefixedText() )
		};
	} ).catch( () => null ); // Failure ignored

	// Retrieve rating from ORES (task 6, only needed for articles) - but don't error out if request fails
	const shouldGetOres = ( subjectIsArticle ); // TODO: Don't need to get ORES for redirects or disambigs
	if ( shouldGetOres ) {
		const latestRevIdPromise = !currentPage.isTalkPage() ?
			$.Deferred().resolve( config.mw.wgRevisionId ) :
			API.get( {
				action: 'query',
				format: 'json',
				prop: 'revisions',
				titles: subjectPage.getPrefixedText(),
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
		var oresPromise = latestRevIdPromise.then( ( latestRevId ) => {
			if ( !latestRevId ) {
				return false;
			}
			return API.getORES( latestRevId, config.ores.wiki )
				.then( ( result ) => {
					const wiki = ( config && config.ores && config.ores.wiki ) || 'enwiki';
					const root = result && ( result[ wiki ] || result[ Object.keys( result )[ 0 ] ] );
					if ( !root || !root.scores || !root.scores[ latestRevId ] || !root.scores[ latestRevId ].articlequality ) {
						return $.Deferred().reject( 'ok-but-empty' );
					}
					const data = root.scores[ latestRevId ].articlequality;
					if ( data.error ) {
						return $.Deferred().reject( data.error.type, data.error.message );
					}
					const prediction = data.score.prediction;
					const probabilities = data.score.probability;
					const tiers = ( config && config.ores && Array.isArray( config.ores.topTierClasses ) ) ? config.ores.topTierClasses : [ 'FA', 'GA' ];
					const baseline = ( config && config.ores && config.ores.baselineClass ) || 'B';
					if ( tiers.includes( prediction ) ) {
						const sum = tiers.reduce( ( acc, k ) => acc + ( probabilities[ k ] || 0 ), 0 ) + ( probabilities[ baseline ] || 0 );
						return {
							prediction: baseline + ' ' + i18n.t( 'ores-or-higher' ),
							probability: ( sum * 100 ).toFixed( 1 ) + '%'
						};
					}
					return {
						prediction,
						probability: ( probabilities[ prediction ] * 100 ).toFixed( 1 ) + '%'
					};
				} ).catch( () => null ); // Failure ignored;
		} );
	}

	// Open the load dialog
	const isOpenedPromise = $.Deferred();
	const loadDialogWin = windowManager.openWindow( 'loadDialog', {
		promises: [
			bannersPromise,
			loadTalkPromise,
			parseTalkPromise,
			templateDetailsPromise,
			subjectPageCheckPromise,
			shouldGetOres && oresPromise
		],
		ores: shouldGetOres,
		isOpened: isOpenedPromise
	} );

	loadDialogWin.opened.then( isOpenedPromise.resolve );

	$.when(
		prefsPromise,
		loadTalkPromise,
		templateDetailsPromise,
		subjectPageCheckPromise,
		shouldGetOres && oresPromise
	).then(
		// All succeded
		( preferences, talkWikitext, banners, subjectPageCheck, oresPredicition ) => {
			const result = {
				success: true,
				talkpage: talkPage,
				subjectPage: subjectPage,
				talkWikitext: talkWikitext,
				banners: banners,
				preferences: preferences,
				isArticle: subjectIsArticle
			};
			if ( subjectPageCheck ) {
				for ( const key in subjectPageCheck ) {
					if ( Object.prototype.hasOwnProperty.call( subjectPageCheck, key ) ) {
						result[ key ] = subjectPageCheck[ key ];
					}
				}
			}
			if ( oresPredicition && subjectPageCheck && !subjectPageCheck.isGA && !subjectPageCheck.isFA && !subjectPageCheck.isFL ) {
				result.ores = oresPredicition;
			}
			windowManager.closeWindow( 'loadDialog', result );

		}
	); // Any failures are handled by the loadDialog window itself

	// On window closed, check data, and resolve/reject setupCompletedPromise
	loadDialogWin.closed.then( ( data ) => {
		if ( data && data.success ) {
			// Got everything needed: Resolve promise with this data
			setupCompletedPromise.resolve( data );
		} else if ( data && data.error ) {
			// There was an error: Reject promise with error code/info
			setupCompletedPromise.reject( data.error.code, data.error.info );
		} else {
			// Window closed before completion: resolve promise without any data
			setupCompletedPromise.resolve( null );
		}
		cache.clearInvalidItems();
	} );
	return setupCompletedPromise;
};

export default setupRater;
// </nowiki>
