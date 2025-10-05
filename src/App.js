import { setupRater, API, makeErrorMsg, windowManager } from './services/index.js';
import i18n from './services/i18n.js';
import './styles/styles.css';
import { config, loadExternalConfig } from './constants/index.js';
// <nowiki>

function startApp() {
	console.log( '[Rater] startApp called' );

	const showMainWindow = ( data ) => {
		if ( !data || !data.success ) {
			return;
		}
		// Add css class to body to enable background scrolling
		document.getElementsByTagName( 'body' )[ 0 ].classList.add( 'rater-mainWindow-open' );
		// Open the window
		windowManager.openWindow( 'main', data )
			.closed.then( ( result ) => {
				document.getElementsByTagName( 'body' )[ 0 ].classList.remove( 'rater-mainWindow-open' );
				// Restart if needed
				if ( result && result.restart ) {
					windowManager.removeWindows( [ 'main' ] )
						.then( setupRater )
						.then( showMainWindow, showSetupError );
					return;
				}
				// Show notification when saved successfully
				if ( result && result.success ) {
					const $message = $( '<span>' ).append(
						$( '<strong>' ).text( i18n.t( 'notify-saved' ) )
					);
					if ( result.upgradedStub ) {
						$message.append(
							$( '<br>' ),
							// TODO: There should be a link that will edit the article for you
							$( '<span>' ).text( i18n.t( 'notify-stub' ) )
						);
					}
					mw.notify(
						$message,
						{ autoHide: true, autoHideSeconds: 'long', tag: 'Rater-saved' }
					);
				}
			} );
	};

	function showSetupError( code, jqxhr ) {
		return OO.ui.alert(
			makeErrorMsg( code, jqxhr ),
			{ title: i18n.t( 'app-setup-error' ) }
		);
	}

	// When the bundle is loaded on demand, start immediately
	setupRater().then( showMainWindow, showSetupError );
}

// Ensure i18n is loaded before constructing UI so initial labels are localized
console.log( '[Rater] Starting initialization' );
try {
	// Ensure external per-wiki config (if any) is loaded before i18n/UI
	loadExternalConfig().then( () => {
		console.log( '[Rater] External config loaded' );
		// Update API user agent with config version
		if ( config && config.script && config.script.version ) {
			API.updateUserAgent( config.script.version );
		}
		return i18n.load();
	} ).then( () => {
		console.log( '[Rater] i18n loaded' );
		startApp();
	} ).catch( ( e ) => {
		console.log( '[Rater] Error in initialization:', e );
		startApp();
	} );
} catch ( e ) {
	console.log( '[Rater] Error in initialization:', e );
	startApp();
}
// </nowiki>
