import config from '../../config';
import i18n from '../../i18n';
// <nowiki>

function PrefsFormWidget( prefsConfig ) {
	// Configuration initialization
	const prefsOptions = prefsConfig || {};
	// Call parent constructor
	PrefsFormWidget.super.call( this, prefsOptions );

	this.$element.addClass( 'rater-prefsFormWidget' );

	this.layout = new OO.ui.FieldsetLayout( {
		label: i18n.t( 'dialog-prefs' ),
		$element: this.$element
	} );

	this.preferences = {
		autostart: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-autostart' )
		},
		autostartRedirects: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-autostart-redirects' )
		},
		autostartNamespaces: {
			input: new mw.widgets.NamespacesMultiselectWidget(),
			label: i18n.t( 'prefs-autostart-namespaces' )
		},
		bypassRedirects: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-bypass-redirects' )
		},
		autofillClassFromOthers: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-autofill-class-others' )
		},
		autofillClassFromOres: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-autofill-class-ores' )
		},
		autofillImportance: {
			input: new OO.ui.ToggleSwitchWidget(),
			label: i18n.t( 'prefs-autofill-importance' )
		},
		collapseParamsLowerLimit: {
			input: new OO.ui.NumberInputWidget( { min: 1 } ),
			label: i18n.t( 'prefs-min-params' )
		},
		watchlist: {
			input: new OO.ui.ButtonSelectWidget( {
				items: [
					new OO.ui.ButtonOptionWidget( {
						data: 'preferences',
						label: i18n.t( 'prefs-watchlist-default' ),
						title: i18n.t( 'prefs-watchlist-default-title' )
					} ),
					new OO.ui.ButtonOptionWidget( {
						data: 'watch',
						label: i18n.t( 'prefs-watchlist-always' ),
						title: i18n.t( 'prefs-watchlist-always-title' )
					} ),
					new OO.ui.ButtonOptionWidget( {
						data: 'nochange',
						label: i18n.t( 'prefs-watchlist-never' ),
						title: i18n.t( 'prefs-watchlist-never-title' )
					} )
				]
			} ).selectItemByData( 'preferences' ),
			label: i18n.t( 'prefs-watchlist-label' )
		},
		resetCache: {
			input: new OO.ui.ButtonWidget( {
				label: i18n.t( 'prefs-reset-cache' ),
				title: i18n.t( 'prefs-reset-cache-title' ),
				flags: [ 'destructive' ]
			} )
		}
	};

	for ( const prefName in this.preferences ) {
		this.layout.addItems( [
			new OO.ui.FieldLayout( this.preferences[ prefName ].input, {
				label: this.preferences[ prefName ].label,
				align: 'right'
			} )
		] );
	}

	this.preferences.resetCache.input.connect( this, { click: 'onResetCacheClick' } );
}
OO.inheritClass( PrefsFormWidget, OO.ui.Widget );

PrefsFormWidget.prototype.setPrefValues = function ( prefs ) {
	for ( const prefName in prefs ) {
		const value = prefs[ prefName ];
		const input = this.preferences[ prefName ] && this.preferences[ prefName ].input;
		switch ( input && input.constructor.name ) {
			case 'OoUiButtonSelectWidget':
				input.selectItemByData( value );
				break;
			case 'OoUiNumberInputWidget':
			case 'OoUiToggleSwitchWidget':
				input.setValue( value );
				break;
			case 'MwWidgetsNamespacesMultiselectWidget':
				input.clearItems();
				value.forEach( ( ns ) => input.addTag(
					ns.toString(),
					ns === 0 ?
						i18n.t( 'namespace-main' ) :
						config.mw.wgFormattedNamespaces[ ns ]
				)
				);
				break;
		}
	}
};

PrefsFormWidget.prototype.getPrefs = function () {
	const prefs = {};
	for ( const prefName in this.preferences ) {
		const input = this.preferences[ prefName ].input;
		let value;
		switch ( input.constructor.name ) {
			case 'OoUiButtonSelectWidget':
				value = input.findSelectedItem().getData();
				break;
			case 'OoUiToggleSwitchWidget':
				value = input.getValue();
				break;
			case 'OoUiNumberInputWidget':
				value = Number( input.getValue() ); // widget uses strings, not numbers!
				break;
			case 'MwWidgetsNamespacesMultiselectWidget':
				value = input.getValue().map( Number ); // widget uses strings, not numbers!
				break;
		}
		prefs[ prefName ] = value;
	}
	return prefs;
};

PrefsFormWidget.prototype.onResetCacheClick = function () {
	OO.ui.confirm( i18n.t( 'confirm-reset-cache' ) )
		.then( ( confirmed ) => {
			if ( confirmed ) {
				this.emit( 'resetCache' );
			}
		} );
};

export default PrefsFormWidget;
// </nowiki>
