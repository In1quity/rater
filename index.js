/***************************************************************************************************
 Rater --- by Evad37
 > Helps assess WikiProject banners.

 This script is a loader that will load the actual script from the /app.js subpage
 once Resource loader modules are loaded and the page DOM is ready.
 Source code is available at https://github.com/evad37/rater
***************************************************************************************************/
// <nowiki>
$.when(
	// Page ready only; modules will be loaded on demand
	$.ready
).then( () => {
	const conf = mw.config.get( [ 'wgNamespaceNumber', 'wgPageName' ] );
	// Do not operate on Special: pages, nor on non-existent pages or their talk pages
	if ( conf.wgNamespaceNumber < 0 || $( 'li.new[id|=ca-nstab]' ).length ) {
		return;
	}
	// Do not operate on top-level User and User_talk pages (only on subpages)
	if (
		conf.wgNamespaceNumber >= 2 &&
        conf.wgNamespaceNumber <= 3 &&
        !conf.wgPageName.includes( '/' )
	) {
		return;
	}
	// Add a portlet link that will load the main script and its dependencies on demand
	const linkId = 'ca-rater';
	if ( !document.getElementById( linkId ) ) {
		const addLink = () => {
			// Prefer MediaWiki utility API when available
			if ( mw.util && typeof mw.util.addPortletLink === 'function' ) {
				mw.util.addPortletLink( 'p-cactions', '#', 'Rater', linkId, 'Rate quality and importance', '5' );
				return true;
			}
			// Fallback: try to append directly into the actions portlet list
			const portlet = document.getElementById( 'p-cactions' );
			const list = portlet && portlet.getElementsByTagName( 'ul' )[ 0 ];
			if ( list ) {
				const li = document.createElement( 'li' );
				li.id = linkId;
				const a = document.createElement( 'a' );
				a.href = '#';
				a.textContent = 'Rater';
				a.title = 'Rate quality and importance';
				li.appendChild( a );
				list.appendChild( li );
				return true;
			}
			return false;
		};

		if ( addLink() ) {
			$( '#' + linkId ).on( 'click', ( event ) => {
				event.preventDefault();
				// Remove loader link to avoid duplicate button creation by loaded script
				const $el = $( '#' + linkId );
				const $li = $el.is( 'li' ) ? $el : $el.closest( 'li' );
				$li.remove();
				// Load required modules first, then load the main script
				const reqModules = [
					'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
					'oojs-ui-core', 'oojs-ui-widgets', 'oojs-ui-windows',
					'oojs-ui.styles.icons-content', 'oojs-ui.styles.icons-interactions',
					'oojs-ui.styles.icons-moderation', 'oojs-ui.styles.icons-editing-core',
					'mediawiki.widgets', 'mediawiki.widgets.NamespacesMultiselectWidget'
				];
				mw.loader.using( reqModules ).then( () => {
					// Get the title using template substitution (so the same source file be used on both main and sandbox scripts)
					const title = /* </nowiki> */ 'User:Iniquity/rater-core-test.js'; /* <nowiki> */
					mw.loader.load( 'https://www.mediawiki.org/w/index.php?title=' + title + '&action=raw&ctype=text/javascript' );
				} );
			} );
		}
	}
} );
// </nowiki>
