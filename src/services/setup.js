import config from '@constants/config.js';
import i18n from '@services/i18n.js';
import API from '@services/api.js';
import { Template } from '@utils/models/TemplateModel.js';
import { isShellTemplate } from '@services/templateShell.js';
import { loadParamDataAndSuggestions } from '@services/templateParams.js';
import { loadRatings } from '@services/templateRatings.js';
import { addMissingParams } from '@services/autofill.js';
import { getWithRedirectTo } from '@services/templateRedirects.js';
import { stripNamespacePrefix, normalizeTemplateName } from '@utils/wikitext.js';
import { findBannerTemplatesOnTalk } from '@services/templateScanner.js';
// Aliases utilities (namespace-aware)
import { collectAliasesForNames } from '@utils/aliases.js';
import { getBannerNames } from '@services/collectBannersFromCategory.js';
import * as cache from '@services/cache.js';
import windowManager from '@services/windowManager.js';
import { getPrefs } from '@services/prefs.js';
import { filterAndMap } from '@utils/util.js';
import { fetchTalkWikitext, fetchLatestRevId } from '@services/pageContent.js';
import { getPrediction as getOresPrediction } from '@services/ores.js';
import { checkSubjectFeatures } from '@services/subjectPage.js';
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
	const loadTalkPromise = fetchTalkWikitext( talkPage.getPrefixedText() );

	// Parse talk page for banners (task 3)
	const parseTalkPromise = loadTalkPromise.then( ( wikitext ) => bannersPromise.then( ( allBanners ) => findBannerTemplatesOnTalk( {
		wikitext,
		allBanners,
		namespaceAliases: config.templateNamespaceAliases || [],
		shellTemplate: config && config.shellTemplate,
		bannerNamePrefixes: config.bannerNamePrefixes || []
	} )
	) );

	// Retrieve and store TemplateData first, then classes/importances (task 4)
	const templateDetailsPromise = parseTalkPromise.then( ( templates ) => {
		const perTemplate = templates.map( ( template ) => {
			if ( isShellTemplate( template ) ) {
				return $.Deferred().resolve();
			}
			return loadParamDataAndSuggestions( template ).then( () => loadRatings( template ) );
		} );
		return $.when.apply( null, perTemplate ).then( () => {
			templates.forEach( ( t ) => {
				addMissingParams( t );
			} );
			return templates;
		} );
	} );

	// Check subject page features (task 5) - but don't error out if request fails
	const subjectPageCheckPromise = checkSubjectFeatures( subjectPage.getPrefixedText(), subjectIsArticle, config.subjectPageCategories )
		.then( ( res ) => {
			if ( res && res.redirectTarget ) {
				return res;
			}
			if ( res ) {
				return $.extend( {}, res, { isList: !res.isFL && /^Lists? of/.test( subjectPage.getPrefixedText() ) } );
			}
			return res;
		} );

	// Retrieve rating from ORES (task 6, only needed for articles) - but don't error out if request fails
	const shouldGetOres = ( subjectIsArticle ); // TODO: Don't need to get ORES for redirects or disambigs
	let oresPromise = null;
	if ( shouldGetOres ) {
		const latestRevIdPromise = !currentPage.isTalkPage() ?
			$.Deferred().resolve( config.mw.wgRevisionId ) :
			fetchLatestRevId( subjectPage.getPrefixedText() );
		oresPromise = latestRevIdPromise.then( ( latestRevId ) => getOresPrediction( latestRevId ) );
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
