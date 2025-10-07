// <nowiki>
import logger from '@services/logger.js';
const log = logger.get( 'SuggestionLookup' );

const SuggestionLookupTextInputWidget = function SuggestionLookupTextInputWidget( config ) {
	OO.ui.TextInputWidget.call( this, config );
	OO.ui.mixin.LookupElement.call( this, config );
	this.suggestions = Array.isArray( config.suggestions ) ? config.suggestions : [];
	this.$element.addClass( 'rater-suggestionLookupTextInputWidget' );
};
OO.inheritClass( SuggestionLookupTextInputWidget, OO.ui.TextInputWidget );
OO.mixinClass( SuggestionLookupTextInputWidget, OO.ui.mixin.LookupElement );

// Set suggestion. param: Object[] with objects of the form { data: ... , label: ... }
SuggestionLookupTextInputWidget.prototype.setSuggestions = function ( suggestions ) {
	if ( !Array.isArray( suggestions ) ) {
		if ( suggestions !== null && typeof suggestions !== 'undefined' ) {
			log.warn( 'setSuggestions called with a non-array value:', suggestions );
		}
		return;
	}
	this.suggestions = suggestions;
	try {
		log.info( '[Suggestion] setSuggestions: %d items', suggestions.length );
	} catch ( _e ) { /* ignore */ }
};

// Returns data, as a resolution to a promise, to be passed to #getLookupMenuOptionsFromData
SuggestionLookupTextInputWidget.prototype.getLookupRequest = function () {
	// Use simple case-insensitive substring match (works with non-Latin scripts)
	const deferred = $.Deferred().resolve( new RegExp( mw.util.escapeRegExp( this.getValue() ), 'i' ) );
	return deferred.promise( { abort: function () {} } );
};

// ???
SuggestionLookupTextInputWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response || [];
};

// Is passed data from #getLookupRequest, returns an array of menu item widgets
SuggestionLookupTextInputWidget.prototype.getLookupMenuOptionsFromData = function ( pattern ) {
	const labelMatchesInputVal = function ( suggestionItem ) {
		const label = suggestionItem && suggestionItem.label;
		const data = suggestionItem && suggestionItem.data;
		const rawName = ( data && typeof data === 'object' && data.name ) ? data.name : data;
		return ( label && pattern.test( label ) ) || ( rawName && pattern.test( rawName ) );
	};
	const makeMenuOptionWidget = function ( optionItem ) {
		return new OO.ui.MenuOptionWidget( {
			data: optionItem.data,
			label: optionItem.label || optionItem.data
		} );
	};
	const filtered = this.suggestions.filter( labelMatchesInputVal );
	try {
		log.debug( '[Suggestion] filter: value="%s" → %d/%d matched', this.getValue(), filtered.length, this.suggestions.length );
	} catch ( _e ) { /* ignore */ }
	return filtered.map( makeMenuOptionWidget );
};

// Extend onLookupMenuChoose method to emit an choose event
SuggestionLookupTextInputWidget.prototype.onLookupMenuChoose = function ( item ) {
	// Get data
	const itemData = item.getData();
	// Simplify item data if it is an object with a name property
	if ( itemData && itemData.name ) {
		item.setData( itemData.name );
	}
	// First blur the input, to prevent the menu popping back up
	this.$input.blur();
	OO.ui.mixin.LookupElement.prototype.onLookupMenuChoose.call( this, item );
	this.emit( 'choose', itemData );
};

export default SuggestionLookupTextInputWidget;
// </nowiki>
