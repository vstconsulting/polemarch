import HistoryChart from './HistoryChart.js';
import HomeView from '../HomeView.vue';
import { widgets } from './widgets.js';
const guiLocalSettings = spa.utils.guiLocalSettings;

spa.globalComponentsRegistrator.add(HistoryChart);

/**
 * Function, that returns QuerySet for profile/setting page.
 */
function getProfileSettingQsFromStore() {
    let qs = app.application.$store.getters.getQuerySet('user/' + app.api.getUserId() + '/settings');

    if (!qs) {
        return;
    }

    return qs.copy();
}

/**
 * Function, that updates data of QuerySet for profile/setting page
 * and saves updated queryset in store.
 * @param {object} qs QuerySet for profile/setting page
 */
async function updateProfileSettingsQsAndSave(qs) {
    try {
        await qs.execute({ method: 'post', data: qs.cache.data });
        app.application.$store.commit('setQuerySet', {
            url: qs.url,
            queryset: qs,
        });
    } catch (e) {
        console.log(e);
    }
}

/**
 * This function is supposed to be called from 'GuiCustomizer.skin.name.changed' tabSignal.
 * This function updates selected skin and saves ProfileSettings QuerySet.
 * @param {object} customizer GuiCustomizer instance.
 */
function guiCustomizerSkinOnChangeHandler(customizer) {
    let qs = getProfileSettingQsFromStore();

    if (!qs) {
        return;
    }

    qs.cache.data.selectedSkin = customizer.skin.name;

    return updateProfileSettingsQsAndSave(qs);
}

/**
 * This function is supposed to be called from 'GuiCustomizer.skins_custom_settings.saved' tabSignal.
 * This function updates skins_custom_settings and saves ProfileSettings QuerySet.
 * @param {object} customizer GuiCustomizer instance.
 */
function guiCustomizerCustomSettingsOnSaveHandler(customizer) {
    let qs = getProfileSettingQsFromStore();

    if (!qs) {
        return;
    }

    qs.cache.data.skinsSettings = customizer.skins_custom_settings;

    return updateProfileSettingsQsAndSave(qs);
}
/**
 * Method, that updates Dashboard widgets' settings.
 * @param {object} settings Object with new Dashboard widgets' settings.
 */
function updateWidgetSettings(settings) {
    for (let [wName, props] of Object.entries(settings)) {
        if (!widgets[wName]) {
            continue;
        }
        for (let [pName, pValue] of Object.entries(props)) {
            widgets[wName][pName] = pValue;
        }
    }
}

/**
 * Method, that updates line settings of Dashboard pmwChartWidget.
 * @param {object} settings Object with new line settings.
 */
function updateChartLineSettings(settings) {
    for (let [key, value] of Object.entries(settings)) {
        if (!widgets.pmwChartWidget.lines[key]) {
            continue;
        }
        for (let [prop, propValue] of Object.entries(value)) {
            widgets.pmwChartWidget.lines[key][prop] = propValue;
        }
    }
}

/**
 * Method, that updates Dashboard widgets' settings, guiCustomizer settings
 * and auto_update interval.
 * @param {object} settings Object with new settings.
 */
function updateSettings(settings) {
    if (settings.autoupdateInterval) {
        guiLocalSettings.set('page_update_interval', settings.autoupdateInterval);
    }

    if (settings.selectedSkin) {
        guiLocalSettings.set('skin', settings.selectedSkin);
        spa.guiCustomizer.guiCustomizer.skin.name = settings.selectedSkin;
    }

    if (settings.skinsSettings) {
        guiLocalSettings.set('skins_settings', settings.skinsSettings);
        spa.guiCustomizer.guiCustomizer.skins_custom_settings = settings.skinsSettings;
    }

    if (settings.widgetSettings) {
        guiLocalSettings.set('widget_settings', settings.widgetSettings);
        updateWidgetSettings(settings.widgetSettings);
    }

    if (settings.chartLineSettings && widgets.pmwChartWidget) {
        guiLocalSettings.set('chart_line_settings', settings.chartLineSettings);
        updateChartLineSettings(settings.chartLineSettings);
    }

    if (settings.lang) {
        app.setLanguage(settings.lang);
    }
}

if (guiLocalSettings.get('widget_settings')) {
    updateWidgetSettings(guiLocalSettings.get('widget_settings'));
}

if (guiLocalSettings.get('chart_line_settings')) {
    updateChartLineSettings(guiLocalSettings.get('chart_line_settings'));
}

if (guiLocalSettings.get('chart_period')) {
    widgets.pmwChartWidget.setChartPeriod(guiLocalSettings.get('chart_period'));
}

spa.router.mixins.customRoutesComponentsTemplates.home = HomeView;

spa.signals.connect('app.afterInit', (obj) => {
    let app = obj.app;
    let setting_view = app.views['/profile/settings/'];
    let qs = setting_view.objects.clone();
    qs.url = qs.url.format({ [spa.utils.path_pk_key]: app.api.getUserId() }).replace(/^\/|\/$/g, '');

    qs.get().then((instance) => {
        updateSettings(instance.data);

        let qs_1 = app.application.$store.getters.getQuerySet(qs.url);
        if (!qs_1) {
            app.application.$store.commit('setQuerySet', {
                url: qs.url,
                queryset: qs,
            });
        }

        spa.signals.connect('GuiCustomizer.skin.name.changed', guiCustomizerSkinOnChangeHandler);
        spa.signals.connect(
            'GuiCustomizer.skins_custom_settings.saved',
            guiCustomizerCustomSettingsOnSaveHandler,
        );
        spa.signals.connect(
            'GuiCustomizer.skins_custom_settings.reseted',
            guiCustomizerCustomSettingsOnSaveHandler,
        );
    });
});

export { updateSettings, updateWidgetSettings, widgets };
