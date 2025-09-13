import i18n from "./i18n";
import codex from "./codex";
// <nowiki>

/**
 * Open Codex-based main window.
 * Returns an object with a `closed` Promise to mirror OOUI windowManager API.
 * @param {Object} data - setupRater result
 */
function openCodexMainWindow( data ) {
	const container = document.createElement("div");
	container.id = "rater-codex-root";
	document.body.appendChild(container);

	let resolveClosed;
	const closedPromise = new Promise(res => { resolveClosed = res; });

	return codex.load().then(libs => {
		const { createApp, defineComponent, ref, computed, CdxDialog, CdxButton, CdxTabs, CdxTab, CdxTextInput, CdxField, CdxSelect } = libs;
		if (!createApp || !CdxDialog || !CdxButton) {
			throw new Error("Codex/Vue components not available");
		}

		const AppRoot = defineComponent({
			name: "RaterCodexMainWindow",
			components: { CdxDialog, CdxButton, CdxTabs, CdxTab, CdxTextInput, CdxField, CdxSelect },
			setup() {
				const open = ref(true);
				const saving = ref(false);
				const search = ref("");
				const banners = ref((data && data.banners) || []);
				const onClose = () => {
					open.value = false;
				};
				const onAfterClose = () => {
					try { app.unmount(); } catch(_) { void 0; }
					if (container && container.parentNode) container.parentNode.removeChild(container);
					resolveClosed({ success: false });
				};
				const onSave = () => {
					saving.value = true;
					// TODO: Wire actual save flow
					setTimeout(() => {
						saving.value = false;
						open.value = false;
						// mimic result.success just like OOUI path
						resolveClosed({ success: true });
					}, 0);
				};
				const onAdd = () => { try { void search.value; } catch(_) { void 0; } };
				const getBannerName = (tpl) => { try { const t = tpl && tpl.getTitle && tpl.getTitle(); return t && (t.getMainText ? t.getMainText() : (t.getPrefixedText ? t.getPrefixedText() : "")); } catch(_) { return ""; } };
				const makeTemplateWikitext = (tpl) => {
					try {
						const name = tpl.name || (tpl.getTitle && tpl.getTitle() && tpl.getTitle().getMainText()) || "";
						const pipe = tpl.pipeStyle || " |";
						const equals = tpl.equalsStyle || "=";
						const endBraces = tpl.endBracesStyle || "}}";
						const params = (tpl.parameters || []).slice();
						const byName = {};
						params.forEach(p => { if (!p) return; byName[String(p.name)] = p; });
						const ordered = Object.values(byName);
						const parts = ordered.map(p => {
							const isUnnamed = String(parseInt(p.name, 10)) === String(p.name);
							return isUnnamed ? (pipe + (p.value || "")) : (pipe + p.name + equals + (p.value || ""));
						});
						return ("{{" + name + parts.join("") + endBraces).replace(/\n+}}$/, "\n}}");
					} catch(_) { return ""; }
				};
				const preview = computed(() => { try { return (banners.value || []).map(tpl => makeTemplateWikitext(tpl)).join("\n"); } catch(_) { return ""; } });
				return { open, saving, search, banners, onClose, onAfterClose, onSave, onAdd, getBannerName, preview };
			},
			template: `
				<CdxDialog
					:open="open"
					@click-close="onClose"
					@after-close="onAfterClose"
					:close-action-label="'×'"
					:title="'Rater'"
					style="max-width:52rem"
				>
					<template #default>
						<div class="rater-codex-shell" style="min-width:640px;min-height:420px;">
							<!-- Top bar and main content will be progressively migrated here -->
							<div class="rater-codex-topbar" style="display:flex; gap:8px; align-items:center; margin:8px 0 12px 0;">
								<CdxField :label="$t('topbar-add-wikiproject')" :is-fieldset="false" style="flex:1;">
									<CdxTextInput v-model="search" :placeholder="$t('topbar-add-wikiproject')" />
								</CdxField>
								<CdxButton weight="primary" @click="onAdd">{{ $t('button-add') }}</CdxButton>
							</div>

							<div style="margin:12px 0; color:#555">{{ $t ? $t('loading-init') : '${i18n.t("loading-init")}' }}</div>
							<div v-if="banners && banners.length" class="rater-banners" style="margin-top:8px;">
								<div v-for="tpl in banners" :key="getBannerName(tpl)" class="rater-banner" style="display:flex; align-items:center; gap:8px; margin:6px 0;">
									<div style="min-width:220px; font-weight:600;">{{ getBannerName(tpl) }}</div>
									<CdxSelect
										:options="[{ value: null, label: $t('topbar-no-class') }].concat((tpl.classes||[]).map(c => ({ value: c, label: c })))"
										:model-value="(tpl.getParam && tpl.getParam('class') && tpl.getParam('class').value) || null"
										@update:model-value="val => { try { const p = tpl.getParam && tpl.getParam('class'); if (p) p.value = val || ''; else { tpl.parameters = tpl.parameters || []; tpl.parameters.push({ name:'class', value: val||'', wikitext:'|class='+(val||'') }); } } catch(_){} }"
										style="width:160px"
									/>
									<CdxSelect
										:options="[{ value: null, label: $t('topbar-no-importance') }].concat((tpl.importances||[]).map(i => ({ value: i, label: i })))"
										:model-value="(tpl.getParam && tpl.getParam('importance') && tpl.getParam('importance').value) || null"
										@update:model-value="val => { try { const p = tpl.getParam && tpl.getParam('importance'); if (p) p.value = val || ''; else { tpl.parameters = tpl.parameters || []; tpl.parameters.push({ name:'importance', value: val||'', wikitext:'|importance='+(val||'') }); } } catch(_){} }"
										style="width:180px"
									/>
									<CdxButton weight="quiet" @click="() => { try { tpl.parameters = (tpl.parameters||[]).filter(p => p.name !== 'class' && p.name !== 'importance'); } catch(_){} }">{{ $t('banner-clear-params-label') }}</CdxButton>
									<CdxButton weight="quiet" action="destructive" @click="() => { try { const i = banners.indexOf(tpl); if (i>=0) banners.splice(i,1); } catch(_){} }">{{ $t('banner-remove-label') }}</CdxButton>
								</div>
								<div v-for="tpl in banners" :key="getBannerName(tpl)+'-add'" style="display:flex; align-items:center; gap:8px; margin:2px 0 10px 228px;">
									<CdxTextInput :placeholder="$t('parameter-add-name-placeholder')" v-model="tpl._newParamName" style="width:220px" />
									<CdxTextInput :placeholder="$t('parameter-add-value-placeholder')" v-model="tpl._newParamValue" style="width:260px" />
									<CdxButton :disabled="!(tpl._newParamName && (tpl._newParamValue || (tpl.paramData && tpl.paramData[tpl._newParamName] && tpl.paramData[tpl._newParamName].autovalue)))" @click="() => { try { tpl.parameters = tpl.parameters || []; tpl.parameters.push({ name: tpl._newParamName, value: tpl._newParamValue || (tpl.paramData && tpl.paramData[tpl._newParamName] && tpl.paramData[tpl._newParamName].autovalue) || '', wikitext: '|' + tpl._newParamName + '=' + (tpl._newParamValue || (tpl.paramData && tpl.paramData[tpl._newParamName] && tpl.paramData[tpl._newParamName].autovalue) || '') }); tpl._newParamName=''; tpl._newParamValue=''; } catch(_){} }">{{ $t('parameter-add-button-label') }}</CdxButton>
								</div>
							</div>
							<div class="rater-preview" style="margin-top:16px;">
								<CdxField :label="$t('label-preview')" :is-fieldset="false">
									<pre style="white-space:pre-wrap; max-height:240px; overflow:auto;">{{ preview }}</pre>
								</CdxField>
							</div>
						</div>
					</template>
					<template #footer>
						<div style="display:flex; align-items:center; width:100%; gap:8px;">
							<CdxButton action="progressive" :disabled="saving" @click="onSave">{{ $t('action-save') }}</CdxButton>
							<CdxButton weight="quiet">{{ $t('action-preview') }}</CdxButton>
							<CdxButton weight="quiet">{{ $t('action-changes') }}</CdxButton>
							<div style="flex:1"></div>
							<CdxButton @click="onClose">{{ $t('action-close-x') }}</CdxButton>
						</div>
					</template>
				</CdxDialog>
			`
		});

		const app = createApp(AppRoot);
		// Provide a very thin i18n passthrough if needed later
		try { app.config.globalProperties.$t = i18n.t; } catch(_) { void 0; }
		app.mount(container);

		return { closed: closedPromise };
	}).catch(err => {
		// If Codex failed to load, ensure container is cleaned
		try { if (container && container.parentNode) container.parentNode.removeChild(container); } catch(_) { void 0; }
		throw err;
	});
}

export default {
	open: openCodexMainWindow
};
// </nowiki>


