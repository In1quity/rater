// <nowiki>
// Codex/Vue lazy loader, mirroring scriptManager's approach
let _vueCodexCache = null;

function loadVueCodex() {
	if (_vueCodexCache) return _vueCodexCache;
	_vueCodexCache = mw.loader.using(["vue", "@wikimedia/codex"]).then(function () {
		const VueMod = mw.loader.require("vue");
		const CodexPkg = mw.loader.require("@wikimedia/codex");
		return {
			createApp: VueMod.createApp || VueMod.createMwApp,
			defineComponent: VueMod.defineComponent,
			ref: VueMod.ref,
			computed: VueMod.computed,
			watch: VueMod.watch,
			CdxDialog: CodexPkg.CdxDialog || (CodexPkg.components && CodexPkg.components.CdxDialog),
			CdxButton: CodexPkg.CdxButton || (CodexPkg.components && CodexPkg.components.CdxButton),
			CdxTextInput: CodexPkg.CdxTextInput || (CodexPkg.components && CodexPkg.components.CdxTextInput),
			CdxSelect: CodexPkg.CdxSelect || (CodexPkg.components && CodexPkg.components.CdxSelect),
			CdxField: CodexPkg.CdxField || (CodexPkg.components && CodexPkg.components.CdxField),
			CdxTabs: CodexPkg.CdxTabs || (CodexPkg.components && CodexPkg.components.CdxTabs),
			CdxTab: CodexPkg.CdxTab || (CodexPkg.components && CodexPkg.components.CdxTab),
			CdxToggleButton: CodexPkg.CdxToggleButton || (CodexPkg.components && CodexPkg.components.CdxToggleButton),
			CdxMessage: CodexPkg.CdxMessage || (CodexPkg.components && CodexPkg.components.CdxMessage)
		};
	});
	return _vueCodexCache;
}

export default {
	load: loadVueCodex
};
// </nowiki>

