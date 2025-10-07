import BannerWidget from './BannerWidget.js';
import BannerListWidget from './BannerListWidget.js';
import config from '@constants/config.js';
import API, { makeErrorMsg } from '@services/api.js';
import PrefsFormWidget from './PrefsFormWidget.js';
import { setPrefs as ApiSetPrefs } from '@services/prefs.js';
import { applyBannerInsert } from '@services/bannerApply.js';
import { parsePreview, compareDiff } from '@services/preview.js';
import { buildEditSummary } from '@utils/editSummary.js';
import { ensureBannerPrefix } from '@utils/banners.js';
import TopBarWidget from './TopBarWidget.js';
import { buildBannerSuggestions } from '@services/autofill.js';
import { filterAndMap, uniqueArray } from '@utils/util.js';
import { containsTemplate } from '@utils/wikitext.js';
import * as cache from '@services/cache.js';
import i18n from '@services/i18n.js';
import logger from '@services/logger.js';
const log = logger.get( 'MainWindow' );
// <nowiki>

function MainWindow( windowConfig ) {
	MainWindow.super.call( this, windowConfig );
}
OO.inheritClass( MainWindow, OO.ui.ProcessDialog );

MainWindow.static.name = 'main';
MainWindow.static.title = $( '<span>' ).css( { 'font-weight': 'normal' } ).append(
	$( '<a>' ).css( { 'font-weight': 'bold' } ).attr( { href: mw.util.getUrl( 'WP:RATER' ), target: '_blank' } ).text( 'Rater' ),
	' (',
	$( '<a>' ).attr( { href: mw.util.getUrl( 'WT:RATER' ), target: '_blank' } ).text( 'talk' ),
	') ',
	$( '<span>' ).css( { 'font-size': '90%' } ).text( 'v' + config.script.version )
);
MainWindow.static.size = 'large';
// Function to create actions with optional localization
function createActions( useI18n ) {
	const t = useI18n ? i18n.t : ( key ) => key;
	const getLabel = ( key ) => useI18n ? new OO.ui.HtmlSnippet( "<span style='padding:0 1em;'>" + i18n.t( key ) + '</span>' ) : key;

	return [
		// Primary (top right):
		{
			label: 'X', // not using an icon since color becomes inverted, i.e. white on light-grey
			title: t( 'dialog-close-title' ),
			flags: 'primary',
			modes: [ 'edit', 'diff', 'preview' ] // available when current mode isn't "prefs"
		},
		// Safe (top left)
		{
			action: 'showPrefs',
			flags: 'safe',
			icon: 'settings',
			title: t( 'dialog-prefs' ),
			modes: [ 'edit', 'diff', 'preview' ] // available when current mode isn't "prefs"
		},
		// Others (bottom)
		{
			action: 'save',
			accessKey: 's',
			label: useI18n ? getLabel( 'action-save' ) : 'Save',
			flags: [ 'primary', 'progressive' ],
			modes: [ 'edit', 'diff', 'preview' ] // available when current mode isn't "prefs"
		},
		{
			action: 'preview',
			accessKey: 'p',
			label: t( 'action-preview' ),
			modes: [ 'edit', 'diff' ] // available when current mode isn't "preview" or "prefs"
		},
		{
			action: 'changes',
			accessKey: 'v',
			label: t( 'action-changes' ),
			modes: [ 'edit', 'preview' ] // available when current mode isn't "diff" or "prefs"
		},
		{
			action: 'back',
			label: t( 'action-back' ),
			modes: [ 'diff', 'preview' ] // available when current mode is "diff" or "prefs"
		},

		// "prefs" mode only
		{
			action: 'savePrefs',
			label: t( 'action-update' ),
			flags: [ 'primary', 'progressive' ],
			modes: 'prefs'
		},
		{
			action: 'closePrefs',
			label: t( 'action-cancel' ),
			flags: 'safe',
			modes: 'prefs'
		}
	];
}

// Initialize with English fallback (identity) then update after i18n loads
MainWindow.static.actions = createActions( false );
i18n.load().then( () => {
	MainWindow.static.actions = createActions( true );
} );

// Customize the initialize() function: This is where to add content to the dialog body and set up event handlers.
MainWindow.prototype.initialize = function () {
	// Call the parent method.
	MainWindow.super.prototype.initialize.call( this );

	/* --- PREFS --- */
	this.preferences = config.defaultPrefs;

	/* --- TOP BAR --- */
	this.topBar = new TopBarWidget( {
		$overlay: this.$overlay
	} );
	this.$head.css( { height: '73px' } ).append( this.topBar.$element );

	/* --- FOOTER --- */
	this.oresLabel = new OO.ui.LabelWidget( {
		$element: $( "<span style='float:right; padding: 10px; max-width: 50%; text-align: center;'>" ),
		label: $( '<span>' ).append(
			$( '<a>' )
				.attr( { href: mw.util.getUrl( 'mw:ORES' ), target: '_blank' } )
				.append(
					$( '<img>' )
						.css( { 'vertical-align': 'text-bottom;' } )
						.attr( {
							src: '//upload.wikimedia.org/wikipedia/commons/thumb/5/51/Objective_Revision_Evaluation_Service_logo.svg/40px-Objective_Revision_Evaluation_Service_logo.svg.png',
							title: 'Machine predicted quality from ORES',
							alt: 'ORES logo',
							width: '20px',
							height: '20px'
						} )
				),
			' ',
			$( "<span class='oresPrediction'>" )
		)
	} ).toggle( false );
	this.pagetypeLabel = new OO.ui.LabelWidget( {
		$element: $( "<span style='float:right; padding: 10px; max-width: 33.33%; text-align: center;'>" )
	} ).toggle( false );
	this.$foot.prepend( this.oresLabel.$element, this.pagetypeLabel.$element );

	/* --- CONTENT AREA --- */

	// Banners added dynamically upon opening, so just need a layout with an empty list
	this.bannerList = new BannerListWidget( {
		preferences: this.preferences
	} );
	this.editLayout = new OO.ui.PanelLayout( {
		padded: false,
		expanded: false,
		$content: this.bannerList.$element
	} );

	// Preferences, filled in with current prefs upon loading.
	// TODO: Make this into a component, add fields and inputs
	this.prefsForm = new PrefsFormWidget();
	this.prefsLayout = new OO.ui.PanelLayout( {
		padded: true,
		expanded: false,
		$content: this.prefsForm.$element
	} );

	// Preview, Show changes
	this.parsedContentContainer = new OO.ui.FieldsetLayout( {
		label: i18n.t( 'label-preview' )
	} );
	this.parsedContentWidget = new OO.ui.LabelWidget( { label: '', $element: $( '<div>' ) } );
	this.parsedContentContainer.addItems( [
		new OO.ui.FieldLayout(
			this.parsedContentWidget,
			{ align: 'top' }
		)
	] );
	this.parsedContentLayout = new OO.ui.PanelLayout( {
		padded: true,
		expanded: false,
		$content: this.parsedContentContainer.$element
	} );

	this.contentArea = new OO.ui.StackLayout( {
		items: [
			this.editLayout,
			this.prefsLayout,
			this.parsedContentLayout
		],
		padded: false,
		expanded: false
	} );

	this.$body.css( { top: '73px' } ).append( this.contentArea.$element );

	/* --- EVENT HANDLING --- */

	this.topBar.connect( this, {
		searchSelect: 'onSearchSelect',
		setClasses: 'onSetClasses',
		setImportances: 'onSetImportances',
		removeAll: 'onRemoveAll',
		clearAll: 'onClearAll'
	} );
	this.bannerList.connect( this, { updatedSize: 'onBannerListUpdateSize' } );

	// Handle certain keyboard events. Requires something in the Rater window to be focused,
	// so add a tabindex to the body and it's parent container.
	this.$body.attr( 'tabindex', '999' )
		.parent().attr( 'tabindex', '999' ).keydown( ( event ) => {
			let scrollAmount;
			switch ( event.which ) {
				case 33: // page up
					scrollAmount = this.$body.scrollTop() - this.$body.height() * 0.9;
					break;
				case 34: // page down
					scrollAmount = this.$body.scrollTop() + this.$body.height() * 0.9;
					break;
				default:
					return;
			}
			this.$body.scrollTop( scrollAmount );
			event.preventDefault();
		} );

	this.prefsForm.connect( this, { resetCache: 'onResetCache' } );

};

MainWindow.prototype.onBannerListUpdateSize = function () {
	// Get the current scroll amount
	const scrollAmount = this.$body.scrollTop();
	// Update size (which resets the scroll to 0)
	this.updateSize();
	// Scroll to where it was before
	this.$body.scrollTop( scrollAmount );
};

MainWindow.prototype.makeDraggable = function () {
	const $frameEl = this.$element.find( '.oo-ui-window-frame' );
	const $handleEl = this.$element.find( '.oo-ui-processDialog-location' ).css( { cursor: 'move' } );
	// Position for css translate transformations, relative to initial position
	// (which is centered on viewport when scrolled to top)
	const position = { x: 0, y: 0 };
	const constrain = function ( val, minVal, maxVal ) {
		if ( val < minVal ) {
			return minVal;
		}
		if ( val > maxVal ) {
			return maxVal;
		}
		return val;
	};
	const constrainX = ( val ) => {
		// Don't too far horizontally (leave at least 100px visible)
		const limit = window.innerWidth / 2 + $frameEl.outerWidth() / 2 - 100;
		return constrain( val, -1 * limit, limit );
	};
	const constrainY = ( val ) => {
		// Can't take title bar off the viewport, since it's the drag handle
		const minLimit = -1 * ( window.innerHeight - $frameEl.outerHeight() ) / 2;
		// Don't go too far down the page: (whole page height) - (initial position)
		const maxLimit = ( document.documentElement || document ).scrollHeight - window.innerHeight / 2;
		return constrain( val, minLimit, maxLimit );
	};

	let pointerdown = false;
	const dragFrom = {};

	const onDragStart = ( event ) => {
		pointerdown = true;
		dragFrom.x = event.clientX;
		dragFrom.y = event.clientY;
	};
	const onDragMove = ( event ) => {
		if ( !pointerdown || dragFrom.x === null || dragFrom.x === undefined || dragFrom.y === null || dragFrom.y === undefined ) {
			return;
		}
		const dx = event.clientX - dragFrom.x;
		const dy = event.clientY - dragFrom.y;
		dragFrom.x = event.clientX;
		dragFrom.y = event.clientY;
		position.x = constrainX( position.x + dx );
		position.y = constrainY( position.y + dy );
		$frameEl.css( 'transform', `translate(${ position.x }px, ${ position.y }px)` );
	};
	const onDragEnd = () => {
		pointerdown = false;
		delete dragFrom.x;
		delete dragFrom.y;
		// Make sure final positions are whole numbers
		position.x = Math.round( position.x );
		position.y = Math.round( position.y );
		$frameEl.css( 'transform', `translate(${ position.x }px, ${ position.y }px)` );
	};

	// Use pointer events if available; otherwise use mouse events
	const pointer = ( 'PointerEvent' in window ) ? 'pointer' : 'mouse';
	$handleEl.on( pointer + 'enter.raterMainWin', () => $frameEl.css( 'will-change', 'transform' ) ); // Tell browser to optimise transform
	$handleEl.on( pointer + 'leave.raterMainWin', () => {
		if ( !pointerdown ) {
			$frameEl.css( 'will-change', '' );
		}
	} ); // Remove optimisation if not dragging
	$handleEl.on( pointer + 'down.raterMainWin', onDragStart );
	$( 'body' ).on( pointer + 'move.raterMainWin', onDragMove );
	$( 'body' ).on( pointer + 'up.raterMainWin', onDragEnd );
};

// Override the getBodyHeight() method to specify a custom height
MainWindow.prototype.getBodyHeight = function () {
	const currentlayout = this.contentArea.getCurrentItem();
	const layoutHeight = currentlayout && currentlayout.$element.outerHeight( true );
	const contentHeight = currentlayout && currentlayout.$element.children( ':first-child' ).outerHeight( true );
	return Math.max( 200, layoutHeight, contentHeight );
};

// Use getSetupProcess() to set up the window with data passed to it at the time
// of opening
MainWindow.prototype.getSetupProcess = function ( data ) {
	data = data || {};
	return MainWindow.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			this.makeDraggable();
			// Set up preferences
			this.setPreferences( data.preferences );
			this.prefsForm.setPrefValues( data.preferences );
			// Set subject page info
			this.subjectPage = data.subjectPage;
			this.pageInfo = {
				redirect: data.redirectTarget,
				isDisambig: data.disambig,
				hasStubtag: data.stubtag,
				isArticle: data.isArticle
			};
			// Set up edit mode banners
			this.actions.setMode( 'edit' );
			this.bannerList.oresClass = ( data.isArticle && data.isList ) ?
				'List' :
				data.ores && data.ores.prediction;
			this.bannerList.pageInfo = this.pageInfo;

			// Debug logging for UI data processing
			log.info( 'UI data processing debug:' );
			log.info( '  - Data received from setup.js:', {
				bannersCount: data.banners ? data.banners.length : 'undefined',
				ores: data.ores ? 'present' : 'undefined',
				pageInfo: data.pageInfo ? 'present' : 'undefined'
			} );

			if ( data.banners ) {
				// Update TopBar suggestions when banners are available
				try {
					const source = data.bannerNames || { withRatings: [], withoutRatings: [], wrappers: [], notWPBM: [], inactive: [], wir: [] };
					const counts = {
						withRatings: ( source.withRatings || [] ).length,
						withoutRatings: ( source.withoutRatings || [] ).length,
						wrappers: ( source.wrappers || [] ).length,
						notWPBM: ( source.notWPBM || [] ).length,
						inactive: ( source.inactive || [] ).length,
						wir: ( source.wir || [] ).length
					};
					log.info( '  - Suggestion source groups:', counts );
					const bannerOptions = buildBannerSuggestions( source );
					log.info( '  - Built %d banner suggestions', ( bannerOptions || [] ).length );
					( bannerOptions || [] ).slice( 0, 5 ).forEach( ( opt, i ) => log.info( '    %d. %s', i + 1, opt && opt.label ) );
					this.topBar.searchBox.setSuggestions( bannerOptions );
				} catch ( _e ) { /* ignore */ }
				log.info( '  - Banner templates from setup.js:' );
				data.banners.forEach( ( bannerTemplate, i ) => {
					const isShell = bannerTemplate.isShellTemplate ? bannerTemplate.isShellTemplate() : 'unknown';
					const name = bannerTemplate.getTitle ? bannerTemplate.getTitle().getMainText() : 'unknown';
					log.info( '    - Banner %d: "%s" (isShell: %s)', i, name, isShell );
				} );
			}

			this.bannerList.addItems(
				data.banners.map( ( bannerTemplate ) => new BannerWidget(
					bannerTemplate,
					{
						preferences: this.preferences,
						$overlay: this.$overlay,
						isArticle: this.pageInfo.isArticle
					}
				) )
			);

			// Debug logging after adding items to UI
			log.info( '  - Banner widgets created: %d', this.bannerList.items.length );
			log.info( '  - Banner widgets in UI:' );
			this.bannerList.items.forEach( ( bannerWidget, i ) => {
				const name = bannerWidget.template ? bannerWidget.template.getTitle().getMainText() : 'unknown';
				const isShell = bannerWidget.isShellTemplate;
				log.info( '    - UI Banner %d: "%s" (isShell: %s)', i, name, isShell );
			} );
			const shellTemplateBanner = this.bannerList.items.find( ( banner ) => banner.isShellTemplate );
			if ( shellTemplateBanner && shellTemplateBanner.shellParam1Value ) {
				shellTemplateBanner.nonStandardTemplates = this.bannerList.items.reduce(
					( bannersList, curBanner ) => bannersList.replace( curBanner.wikitext, '' ),
					shellTemplateBanner.shellParam1Value
				).trim().replace( /\n+/g, '\n' );
			}
			this.bannerList.addShellTemplateIfNeeeded()
				.syncShellTemplateWithBiographyBanner();
			// Show page type, or ORES prediction, if available
			if ( this.pageInfo.redirect ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-redirect-page' ) ).toggle( true );
			} else if ( this.pageInfo.isDisambig ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-disambig-page' ) ).toggle( true );
			} else if ( this.pageInfo.isArticle && data.isGA ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-good-article' ) ).toggle( true );
			} else if ( this.pageInfo.isArticle && data.isFA ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-featured-article' ) ).toggle( true );
			} else if ( this.pageInfo.isArticle && data.isFL ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-featured-list' ) ).toggle( true );
			} else if ( this.pageInfo.isArticle && data.isList ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-list-article' ) ).toggle( true );
			} else if ( data.ores ) {
				this.oresClass = data.ores.prediction;
				this.oresLabel.toggle( true ).$element.find( '.oresPrediction' ).append(
					i18n.t( 'label-prediction' ),
					$( '<strong>' ).text( data.ores.prediction ),
					'\u00A0(' + data.ores.probability + ')'
				);
			} else if ( this.pageInfo.isArticle ) {
				this.pagetypeLabel.setLabel( i18n.t( 'label-article-page' ) ).toggle( true );
			} else {
				this.pagetypeLabel.setLabel( this.subjectPage.getNamespacePrefix().slice( 0, -1 ) + ' page' ).toggle( true );
			}
			// Set props for use in making wikitext and edit summaries
			this.talkWikitext = data.talkWikitext;
			this.existingBannerNames = data.banners.map( ( bannerTemplate ) => bannerTemplate.name );
			this.talkpage = data.talkpage;
			// Force a size update to ensure eveything fits okay
			this.updateSize();
		}, this );
};

// Set up the window it is ready: attached to the DOM, and opening animation completed
MainWindow.prototype.getReadyProcess = function ( data ) {
	data = data || {};
	return MainWindow.super.prototype.getReadyProcess.call( this, data )
		.next( () => this.topBar.searchBox.focus() );
};

// Use the getActionProcess() method to do things when actions are clicked
MainWindow.prototype.getActionProcess = function ( action ) {
	if ( action === 'showPrefs' ) {
		this.actions.setMode( 'prefs' );
		this.contentArea.setItem( this.prefsLayout );
		this.topBar.setDisabled( true );
		this.updateSize();

	} else if ( action === 'savePrefs' ) {
		const updatedPrefs = this.prefsForm.getPrefs();
		return new OO.ui.Process().next(
			ApiSetPrefs( updatedPrefs ).then(
				// Success
				() => {
					this.setPreferences( updatedPrefs );
					this.actions.setMode( 'edit' );
					this.contentArea.setItem( this.editLayout );
					this.topBar.setDisabled( false );
					this.updateSize();
				},
				// Failure
				( code, err ) => $.Deferred().reject(
					new OO.ui.Error(
						$( '<div>' ).append(
							$( "<strong style='display:block;'>" ).text( i18n.t( 'error-save-prefs' ) ),
							$( "<span style='color:#777'>" ).text( makeErrorMsg( code, err ) )
						)
					)
				)
			)
		);

	} else if ( action === 'clearCache' ) {
		return new OO.ui.Process().next( () => {
			cache.clearAllItems();
			this.close( { restart: true } );
		} );

	} else if ( action === 'closePrefs' ) {
		this.actions.setMode( 'edit' );
		this.contentArea.setItem( this.editLayout );
		this.topBar.setDisabled( false );
		this.prefsForm.setPrefValues( this.preferences );
		this.updateSize();

	} else if ( action === 'save' ) {
		return new OO.ui.Process().next(
			API.editWithRetry(
				this.talkpage.getPrefixedText(),
				{ rvsection: 0 },
				( revision ) => ( {
					section: 0,
					text: this.transformTalkWikitext( revision.content ),
					summary: this.makeEditSummary(),
					watchlist: this.preferences.watchlist
				} )
			).catch( ( code, err ) => $.Deferred().reject(
				new OO.ui.Error(
					$( '<div>' ).append(
						$( "<strong style='display:block;'>" ).text( i18n.t( 'error-could-not-save' ) ),
						$( "<span style='color:#777'>" ).text( makeErrorMsg( code, err ) )
					)
				)
			) )
		).next( () => this.close( {
			success: true,
			upgradedStub: this.pageInfo.hasStubtag && this.isRatedAndNotStub()
		} ) );

	} else if ( action === 'preview' ) {
		return new OO.ui.Process().next(
			parsePreview( {
				talkWikitext: this.transformTalkWikitext( this.talkWikitext ),
				summary: this.makeEditSummary(),
				title: this.talkpage.getPrefixedText(),
				label: i18n.t( 'label-edit-summary' )
			} ).then( ( result ) => {
				if ( !result || !result.parse || !result.parse.text || !result.parse.text[ '*' ] ) {
					return $.Deferred().reject( 'Empty result' );
				}
				const previewHtmlSnippet = new OO.ui.HtmlSnippet( result.parse.text[ '*' ] );

				this.parsedContentWidget.setLabel( previewHtmlSnippet );
				this.parsedContentContainer.setLabel( i18n.t( 'label-preview' ) + ':' );
				this.actions.setMode( 'preview' );
				this.contentArea.setItem( this.parsedContentLayout );
				this.topBar.setDisabled( true );
				this.updateSize();
			} )
				.catch( ( code, err ) => $.Deferred().reject(
					new OO.ui.Error(
						$( '<div>' ).append(
							$( "<strong style='display:block;'>" ).text( i18n.t( 'error-could-not-show-changes' ) ),
							$( "<span style='color:#777'>" ).text( makeErrorMsg( code, err ) )
						)
					)
				) )
		);

	} else if ( action === 'changes' ) {
		return new OO.ui.Process().next(
			compareDiff( {
				fromText: this.talkWikitext,
				toText: this.transformTalkWikitext( this.talkWikitext ),
				title: this.talkpage.getPrefixedText()
			} )
				.then( ( result ) => {
					if ( !result || !result.compare || !result.compare[ '*' ] ) {
						return $.Deferred().reject( 'Empty result' );
					}
					const $diff = $( '<table>' ).addClass( 'diff' ).css( 'width', '100%' ).append(
						$( '<tr>' ).append(
							$( '<th>' ).attr( { colspan: '2', scope: 'col' } ).css( 'width', '50%' ).text( i18n.t( 'label-latest-revision' ) ),
							$( '<th>' ).attr( { colspan: '2', scope: 'col' } ).css( 'width', '50%' ).text( i18n.t( 'label-new-text' ) )
						),
						result.compare[ '*' ],
						$( '<tfoot>' ).append(
							$( '<tr>' ).append(
								$( "<td colspan='4'>" ).append(
									$( '<strong>' ).text( i18n.t( 'label-edit-summary' ) + ' ' ),
									this.makeEditSummary()
								)
							)
						)
					);

					this.parsedContentWidget.setLabel( $diff );
					this.parsedContentContainer.setLabel( i18n.t( 'label-changes' ) );
					this.actions.setMode( 'diff' );
					this.contentArea.setItem( this.parsedContentLayout );
					this.topBar.setDisabled( true );
					this.updateSize();
				} )
				.catch( ( code, err ) => $.Deferred().reject(
					new OO.ui.Error(
						$( '<div>' ).append(
							$( "<strong style='display:block;'>" ).text( i18n.t( 'error-could-not-show-changes' ) ),
							$( "<span style='color:#777'>" ).text( makeErrorMsg( code, err ) )
						)
					)
				) )
		);

	} else if ( action === 'back' ) {
		this.actions.setMode( 'edit' );
		this.contentArea.setItem( this.editLayout );
		this.topBar.setDisabled( false );
		this.updateSize();

	} else if ( !action && this.bannerList.changed ) {
		// Confirm closing of dialog if there have been changes
		return new OO.ui.Process().next(
			OO.ui.confirm( i18n.t( 'confirm-close' ), { title: i18n.t( 'confirm-close-title' ) } )
				.then( ( confirmed ) => confirmed ? this.close() : null )
		);
	}

	return MainWindow.super.prototype.getActionProcess.call( this, action );
};

// Use the getTeardownProcess() method to perform actions whenever the dialog is closed.
// `data` is the data passed into the window's .close() method.
MainWindow.prototype.getTeardownProcess = function ( data ) {
	return MainWindow.super.prototype.getTeardownProcess.call( this, data )
		.first( () => {
			this.bannerList.clearItems();
			this.topBar.searchBox.setValue( '' );
			this.contentArea.setItem( this.editLayout );
			this.topBar.setDisabled( false );
			this.oresLabel.toggle( false ).$element.find( '.oresPrediction' ).empty();
			this.pagetypeLabel.toggle( false ).setLabel( '' );

			this.$element.find( '.oo-ui-window-frame' ).css( 'transform', '' );
			this.$element.find( '.oo-ui-processDialog-location' ).off( '.raterMainWin' );
			$( 'body' ).off( '.raterMainWin' );
		} );
};

MainWindow.prototype.setPreferences = function ( prefs ) {
	this.preferences = $.extend( {}, config.defaultPrefs, prefs );
	// Applies preferences to existing items in the window:
	this.bannerList.setPreferences( this.preferences );
};

MainWindow.prototype.onResetCache = function () {
	this.executeAction( 'clearCache' );
};

MainWindow.prototype.onSearchSelect = function ( data ) {
	this.topBar.searchBox.pushPending();
	// Prefer the canonical template name from the selected suggestion, if provided
	let name = ( data && data.name ) || this.topBar.searchBox.getValue().trim();
	if ( !name ) {
		this.topBar.searchBox.popPending().focus();
		return;
	}
	const existingBanner = this.bannerList.items.find( ( banner ) => banner.mainText === name || banner.redirectTargetMainText === name );

	// Abort and show alert if banner already exists
	if ( existingBanner ) {
		this.topBar.searchBox.popPending();
		return OO.ui.alert( 'There is already a {{' + name + '}} banner' ).then( this.searchBox.focus() );
	}

	// Also check raw talk wikitext content to prevent duplicates that are not in UI for any reason
	try {
		if ( typeof this.talkWikitext === 'string' && this.talkWikitext ) {
			const exists = containsTemplate( { content: this.talkWikitext, names: [ name ], namespaceAliases: [], topMarker: '__TOP__' } );
			if ( exists ) {
				this.topBar.searchBox.popPending();
				return OO.ui.alert( 'The page already contains {{' + name + '}}' ).then( this.searchBox.focus() );
			}
		}
	} catch ( _e ) { /* ignore */ }

	// If user typed a short form without a recognized prefix, try to auto-prepend the first configured prefix
	let confirmText;
	const ensured = ensureBannerPrefix( name, config.bannerNamePrefixes || [] );
	name = ensured.name;
	if ( !ensured.hasValidPrefix && !ensured.addedPrefix ) {
		confirmText = new OO.ui.HtmlSnippet(
			'{{' + mw.html.escape( name ) + '}} is not a recognised WikiProject banner.<br/>Do you want to continue?'
		);
	} else if ( name === 'WikiProject Disambiguation' && $( '#ca-talk.new' ).length !== 0 && this.bannerList.items.length === 0 ) {

		confirmText = "New talk pages shouldn't be created if they will only contain the \{\{WikiProject Disambiguation\}\} banner. Continue?";
	}
	$.when( confirmText ? OO.ui.confirm( confirmText ) : true )
		.then( ( confirmed ) => {
			if ( !confirmed ) {
				return;
			}
			// Create Template object
			return BannerWidget.newFromTemplateName( name, data, {
				preferences: this.preferences,
				$overlay: this.$overlay,
				isArticle: this.pageInfo.isArticle
			} )
				.then( ( banner ) => {
					this.bannerList.addItems( [ banner ] );
					banner.setChanged();
					this.updateSize();
				} );
		} )
		.then( () => this.topBar.searchBox.setValue( '' ).focus().popPending() );
};

MainWindow.prototype.onSetClasses = function ( classVal ) {
	const shellTemplate = this.bannerList.items.find( ( banner ) => banner.isShellTemplate );
	if ( shellTemplate ) {
		shellTemplate.classDropdown.getMenu().selectItemByData( classVal );
		shellTemplate.classDropdown.setAutofilled( false );
	}
	this.bannerList.items.forEach( ( banner ) => {
		if ( banner.hasClassRatings && !banner.isShellTemplate ) {
			banner.classDropdown.getMenu().selectItemByData( shellTemplate ? null : classVal );
			banner.classDropdown.setAutofilled( false );
		}
	} );
};

MainWindow.prototype.onSetImportances = function ( importanceVal ) {
	this.bannerList.items.forEach( ( banner ) => {
		if ( banner.hasImportanceRatings ) {
			banner.importanceDropdown.getMenu().selectItemByData( importanceVal );
			banner.importanceDropdown.setAutofilled( false );
		}
	} );
};

MainWindow.prototype.onRemoveAll = function () {
	this.bannerList.clearItems();
};

MainWindow.prototype.onClearAll = function () {
	this.bannerList.items.forEach( ( banner ) => banner.onClearButtonClick() );
};

MainWindow.prototype.transformTalkWikitext = function ( talkWikitext ) {
	const bannersWikitext = this.bannerList.makeWikitext();
	return applyBannerInsert( talkWikitext, bannersWikitext, this.existingBannerNames );
};

MainWindow.prototype.isRatedAndNotStub = function () {
	const nonStubRatinggs = this.bannerList.items.filter( ( banner ) => banner.hasClassRatings &&
		banner.classDropdown.getValue() &&
		banner.classDropdown.getValue() !== 'Stub'
	);
	return nonStubRatinggs.length > 0;
};

MainWindow.prototype.makeEditSummary = function () {
	const removed = [];
	const edited = [];
	const added = [];
	const shortName = ( name ) => name.replace( 'WikiProject ', '' ).replace( 'Subst:', '' );

	const allClasses = uniqueArray( filterAndMap( this.bannerList.items, ( b ) => b.hasClassRatings || b.isShellTemplate, ( b ) => b.classDropdown.getValue() ) );
	const overallClass = ( allClasses.length === 1 && allClasses[ 0 ] ) || null;
	const allImportances = uniqueArray( filterAndMap( this.bannerList.items, ( b ) => b.hasImportanceRatings, ( b ) => b.importanceDropdown.getValue() ) );
	const overallImportance = ( allImportances.length === 1 && allImportances[ 0 ] ) || null;

	let someClassesChanged = false;
	let someImportancesChanged = false;

	this.existingBannerNames.forEach( ( name ) => {
		const exists = this.bannerList.items.find( ( b ) => b.name === name || b.bypassedName === name );
		if ( !exists ) {
			removed.push( '−' + shortName( name ) );
		}
	} );

	this.bannerList.items.forEach( ( b ) => {
		const isNew = !b.wikitext;
		if ( !isNew && !b.changed ) {
			return;
		}
		let newClass = b.hasClassRatings && ( isNew || b.classChanged ) && b.classDropdown.getValue();
		if ( newClass ) {
			someClassesChanged = true;
		}
		if ( overallClass ) {
			newClass = null;
		}
		let newImportance = b.hasImportanceRatings && ( isNew || b.importanceChanged ) && b.importanceDropdown.getValue();
		if ( newImportance ) {
			someImportancesChanged = true;
		}
		if ( overallImportance ) {
			newImportance = null;
		}
		let rating = ( newClass && newImportance ) ? ( newClass + '/' + newImportance ) : ( newClass || newImportance || '' );
		if ( rating ) {
			rating = ' (' + rating + ')';
		}
		if ( isNew ) {
			added.push( '+' + shortName( b.name ) + rating );
		} else {
			edited.push( shortName( b.name ) + rating );
		}
	} );

	const effOverallClass = ( someClassesChanged ? overallClass : null );
	const effOverallImportance = ( someImportancesChanged ? overallImportance : null );
	return buildEditSummary( { removed, edited, added, overallClass: effOverallClass, overallImportance: effOverallImportance, advert: config.script.advert } );
};

export default MainWindow;
// </nowiki>
