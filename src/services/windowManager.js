import MainWindow from '../components/MainWindow.js';
// <nowiki>

const factory = new OO.Factory();

// Register window constructors with the factory.
factory.register( MainWindow );

const manager = new OO.ui.WindowManager( {
	factory: factory
} );
$( document.body ).append( manager.$element );

export default manager;
// </nowiki>
