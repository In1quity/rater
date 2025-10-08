import config from '@constants/config.js';
import logger from '@services/logger.js';
const log = logger.get( 'autostart' );
import { getPrefs } from '@services/prefs.js';
import API, { makeErrorMsg } from '@services/api.js';
import setupRater from '@services/setup.js';
// <nowiki>

const autoStart = function autoStart() {

	return getPrefs().then( ( prefs ) => {
		// Check if pref is turned off
		if ( !prefs.autostart ) {
			return;
		}
		// Check if pref is turned off for redirects, and current page is a redirect
		if ( !prefs.autostartRedirects && window.location.search.includes( 'redirect=no' ) ) {
			return;
		}
		// Check if viewing diff/history/old version
		if ( /(action|diff|oldid)/.test( window.location.search ) ) {
			return;
		}
		const subjectTitle = mw.Title.newFromText( config.mw.wgPageName ).getSubjectPage();
		// Check if subject page is the main page
		if ( subjectTitle.getPrefixedText() === 'Main Page' ) {
			return;
		}
		// Check subject page namespace
		if (
			prefs.autostartNamespaces &&
			prefs.autostartNamespaces.length &&
			!prefs.autostartNamespaces.includes( config.mw.wgNamespaceNumber )
		) {
			return;
		}

		// If talk page does not exist, can just autostart
		if ( document.querySelector( '#ca-talk.new' ) ) {
			return setupRater();
		}

		/* Check templates present on talk page. Fetches indirectly transcluded templates, so will find
			Template:WPBannerMeta (and its subtemplates). But some banners such as MILHIST don't use that
			meta template, so we also have to check for template titles containg 'WikiProject'
		*/
		const talkTitle = mw.Title.newFromText( config.mw.wgPageName ).getTalkPage();
		return API.get( {
			action: 'query',
			format: 'json',
			prop: 'templates',
			titles: talkTitle.getPrefixedText(),
			tlnamespace: '10',
			tllimit: '500',
			indexpageids: 1
		} )
			.then( ( result ) => {
				const id = result.query.pageids;
				const templates = result.query.pages[ id ].templates;

				if ( !templates ) {
					return setupRater();
				}

				const hasWikiproject = templates.some( ( template ) => /(WikiProject|WPBanner)/.test( template.title ) );

				if ( !hasWikiproject ) {
					return setupRater();
				}

			},
			( code, jqxhr ) => {
			// Silently ignore failures (just log to console)
				log.warn(
					'[Rater] Error while checking whether to autostart.' +
					( code === null || typeof code === 'undefined' ? '' : ' ' + makeErrorMsg( code, jqxhr ) )
				);
				throw new Error( 'Autostart check failed' );
			} );
	} );

};

export default autoStart;
// </nowiki>
