// <nowiki>

/**
 * A HorizontalLayout that is also a widget, and can thus be placed within
 * field layouts.
 *
 * @class
 * @param {*} config configuration for OO.ui.HorizontalLayout
 */
function HorizontalLayoutWidget( config ) {
	// Configuration initialization
	config = config || {};
	// Call parent constructor
	HorizontalLayoutWidget.super.call( this, {} );

	this.layout = new OO.ui.HorizontalLayout( ( function () {
		const o = {};
		for ( const k in config ) {
			if ( Object.prototype.hasOwnProperty.call( config, k ) ) {
				o[ k ] = config[ k ];
			}
		}
		o.$element = this.$element;
		return o;
	} ).call( this ) );

}
OO.inheritClass( HorizontalLayoutWidget, OO.ui.Widget );

export default HorizontalLayoutWidget;
// </nowiki>
