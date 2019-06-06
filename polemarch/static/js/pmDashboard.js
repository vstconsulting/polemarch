/**
 * Class of history chart widget.
 */
guiWidgets.history_chart = class HistoryChart extends guiWidgets.line_chart {
    constructor(options) {
        super(options);

        this.format = 'history_chart';
        this.period = options.period;
        this.date_format = 'DD.MM.YY';

        Object.defineProperty(this, 'chart_options', {
            get: function() {
                return {
                    maintainAspectRatio: false,
                    legend: {
                        labels: {
                            fontColor: guiCustomizer.skin.settings.chart_legend_text_color,
                        },
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero:true,
                                fontColor: guiCustomizer.skin.settings.chart_axes_text_color,

                            },
                            gridLines: {
                                color: guiCustomizer.skin.settings.chart_axes_lines_color,
                            }
                        }],
                        xAxes: [{
                            ticks: {
                                fontColor: guiCustomizer.skin.settings.chart_axes_text_color,

                            },
                            gridLines: {
                                color: guiCustomizer.skin.settings.chart_axes_lines_color,
                            }
                        }]
                    }
                };
            }
        });
    }

    /**
     * Method, that returns chart start time moment (first period on xAxes) -
     * time in ISO 8601 format.
     * @return {number}
     * @private
     */
    _getChartStartTime() {
        // defines current months and year
        let monthNum = moment().format("MM");
        let yearNum = moment().format("YYYY");
        let dayNum = moment().format("DD");
        let hourNum = ",T00:00:00";
        let startTimeOrg = "";

        switch(this.period.type) {
            case "year":
                startTimeOrg = yearNum + "-01-01" + hourNum;
                break;
            case "month":
                startTimeOrg = yearNum + "-" + monthNum + "-01" + hourNum;
                break;
            case "day":
                startTimeOrg = yearNum + "-" + monthNum + "-" + dayNum + hourNum;
                break;
        }

        return Number(
            moment(startTimeOrg).subtract(this.period.amount - 1, this.period.type).tz(window.timeZone).format("x"),
        );
    }
    /**
     * Redefinition of '_formChartDataLabels' method of guiWidgets.line_chart class.
     * @returns {Array}
     * @private
     */
    _formChartDataLabels(raw_data) {
        let labels = [];
        let start_time = this._getChartStartTime();

        for(let i = -1; i< this.period.amount; i++) {
            // period up
            let time =+ moment(start_time).add(i, this.period.type).tz(window.timeZone).format("x");
            time = moment(time).tz(window.timeZone).format(this.date_format);
            labels.push(time);
        }

        return labels;
    }
    /**
     * Redefinition of '_formChartDataDatasets_oneLine' method of guiWidgets.line_chart class.
     * @private
     */
    _formChartDataDatasets_oneLine(line, raw_data, labels) {
        let data = {};

        for(let index in labels) {
            data[labels[index]] = 0;
        }

        for(let index in raw_data[this.period.type]) {
            let item = raw_data[this.period.type][index];

            let time =+ moment(item[this.period.type]).tz(window.timeZone).format("x");
            time = moment(time).tz(window.timeZone).format(this.date_format);

            if(data[time] === undefined) {
                continue;
            }

            if(line.name.toLowerCase() == 'all_tasks') {
                data[time] = item.all;
            } else if(line.name.toLowerCase() == item.status.toLowerCase()) {
                data[time] = item.sum;
            }
        }

        return Object.values(data).map(item => Number(item));
    }
    /**
     * Method, that form data sets for chart lines.
     * @param {object} raw_data Object with raw data for chart.
     * @param {array} labels Array with chart labels.
     * @return {Array}
     * @private
     */
    _formChartDataDatasets(raw_data, labels) {
        let datasets = [];

        for(let index in this.lines) {
            let line = this.lines[index];

            if(!line.active) continue;

            datasets.push({
                label: line.title || line.name,
                data: this._formChartDataDatasets_oneLine(line, raw_data, labels),
                borderColor: this._getChartLineColor(line),
                backgroundColor: this._getChartLineColor(line, true),
            });
        }

        return datasets;
    }
    /**
     * Method, that returns current color for chart line.
     * @param {object} line Object with chart line settings.
     * @param {boolean} bg If true - color should be return for 'background-color' CSS property.
     * Otherwise, should be return for 'color' CSS property.
     * @private
     */
    _getChartLineColor(line, bg) {
        let alpha = 1;
        let prop = 'color';
        let skin = guiCustomizer.skin.settings;

        if(bg) {
            alpha = 0.3;
            prop = 'bg_color';
        }

        if(skin['history_status_' + line.name]) {
            if(skin['history_status_' + line.name][0] == "#") {
                let color = hexToRgbA(skin['history_status_' + line.name], alpha);
                return color
            }

            return skin['history_status_' + line.name];
        }

        return line[prop];
    }
    /**
     * Method, that returns data for widget progress bars - bars that show statistic info.
     * @param {object} raw_data Object with raw data for chart.
     * @returns {object}
     */
    getProgressBarsData(raw_data) {
        let all = 0;
        let data = {};

        for(let index in this.lines) {
            let line = this.lines[index];

            if(line.name == 'all_tasks') continue;

            data[line.name] = {
                all: all,
                sum: 0,
                status: line.name.toUpperCase(),
            }
        }

        if(raw_data && raw_data.year) {
            let stats = raw_data.year;

            for(let index in stats) {
                let record = stats[index];
                let status = record.status.toLowerCase();

                data[status].sum += record.sum;
            }

            for(let key in data) {
                all += data[key].sum;
            }

            for(let key in data) {
                data[key].all = all;
            }
        }

        return data;
    }
    /**
     * Method, that sets chart period settings based on period.amount property.
     * @param {number} number New period.amount property.
     */
    setChartPeriod(number) {
        let amount, type;
        let num = Number(number);

        switch(num) {
            case 1095:
                amount = 3;
                type = "year";
                break;
            case 365:
                amount = 13;
                type = "month";
                break;
            case 90:
                amount = 3;
                type = "month";
                break;
            default:
                amount = num;
                type = "day";
                break;
        }

        this.period = {
            type: type,
            amount: amount,
            query_amount: num,
        };

        guiLocalSettings.set('chart_period', num);
    }
};

/**
 * Sets Dashboard counter widgets.
 */
[
    {name: 'pmwTemplatesCounter',   title: 'template',    sort: 1, active: true,},
    {name: 'pmwProjectsCounter',    title: 'projects',    sort: 2, active: true, url: '/project'},
    {name: 'pmwInventoriesCounter', title: 'inventories', sort: 3, active: true, url: '/inventory'},
    {name: 'pmwGroupsCounter',      title: 'groups',      sort: 4, active: true, url: '/group'},
    {name: 'pmwHostsCounter',       title: 'hosts',       sort: 5, active: true, url: '/host'},
    {name: 'pmwUsersCounter',       title: 'users',       sort: 6, active: true, url: '/user'},
].forEach(item => {
    guiDashboard.widgets[item.name] = new guiWidgets.counter(item);
});

/**
 * Sets Dashboard history chart widget.
 */
guiDashboard.widgets['pmwChartWidget'] = new guiWidgets.history_chart(
    {
        name: 'pmwChartWidget', title:'Tasks history', sort:7,
        lines: {
            all_tasks: {
                name: "all_tasks",
                title: "All tasks",
                color: "#1f77b4",
                bg_color: "rgba(31, 119, 180, 0.3)",
                active: true,
            },
            ok: {
                name: "ok",
                title: "OK",
                color: "#276900",
                bg_color: "rgba(39, 105, 0, 0.3)",
                active: true,
            },
            error: {
                name: "error",
                title: "ERROR",
                color: "#dc3545",
                bg_color: "rgba(220, 53, 69, 0.3)",
                active: true,
            },
            interrupted: {
                name: "interrupted",
                title: "INTERRUPTED",
                color: "#9b97e4",
                bg_color: "rgba(155, 151, 228, 0.3)",
                active: true,
            },
            delay: {
                name: "delay",
                title: "DELAY",
                color: "#808419",
                bg_color: "rgba(128, 132, 25, 0.3)",
                active: true,
            },
            offline: {
                name: "offline",
                title: "OFFLINE",
                color: "#9e9e9e",
                bg_color: "rgba(158, 158, 158, 0.3)",
                active: true,
            },
        },
        period: {
            /**
             * Type of period interval.
             */
            type: 'day',
            /**
             * Amount of periods.
             */
            amount: 14,
            /**
             * Amount of periods in days.
             * This property is used for API requests.
             */
            query_amount: 14,
        },
    },
);

/**
 * Method, that updates Dashboard widgets' settings.
 * @param {object} settings Object with new Dashboard widgets' settings.
 */
guiDashboard.updateWidgetSettings = function(settings) {
    for(let key in settings) {
        let s_item = settings[key];

        if(!this.widgets[key]) {
            continue;
        }

        for(let prop in s_item) {
            this.widgets[key][prop] = s_item[prop];
        }
    }
};

/**
 * Method, that updates line settings of Dashboard pmwChartWidget.
 * @param {object} settings Object with new line settings.
 */
guiDashboard.updateChartLineSettings = function(settings) {
    for(let key in settings) {
        if(!this.widgets['pmwChartWidget'].lines[key]) {
            continue;
        }

        let s_item = settings[key];

        for(let prop in s_item) {
            this.widgets['pmwChartWidget'].lines[key][prop] = s_item[prop];
        }
    }
};

/**
 * Method, that updates Dashboard widgets' settings, guiCustomizer settings
 * and auto_update interval.
 * @param {object} settings Object with new settings.
 */
guiDashboard.updateSettings = function(settings) {
    if(settings.autoupdateInterval) {
        guiLocalSettings.set('page_update_interval', settings.autoupdateInterval);
    }

    if(settings.selectedSkin) {
        guiLocalSettings.set('skin', settings.selectedSkin);
        guiCustomizer.skin.name = settings.selectedSkin;
    }

    if(settings.skinsSettings) {
        guiLocalSettings.set('skins_settings', settings.skinsSettings);
        guiCustomizer.skins_custom_settings =  settings.skinsSettings;
    }

    if(settings.widgetSettings) {
        guiLocalSettings.set('widget_settings', settings.widgetSettings);
        guiDashboard.updateWidgetSettings(settings.widgetSettings);
    }

    if(settings.chartLineSettings && guiDashboard.widgets['pmwChartWidget']) {
        guiLocalSettings.set('chart_line_settings', settings.chartLineSettings);
        guiDashboard.updateChartLineSettings(settings.chartLineSettings);
    }
};

if(guiLocalSettings.get('widget_settings')) {
    guiDashboard.updateWidgetSettings(guiLocalSettings.get('widget_settings'));
}

if(guiLocalSettings.get('chart_line_settings')) {
    guiDashboard.updateChartLineSettings(guiLocalSettings.get('chart_line_settings'));
}

if(guiLocalSettings.get('chart_period')) {
    guiDashboard.widgets.pmwChartWidget.setChartPeriod(guiLocalSettings.get('chart_period'));
}

customRoutesComponentsTemplates.home = {
    mixins: [the_basest_view_mixin, view_with_autoupdate_mixin],
    template: "#template_pm_dashboard",
    data() {
        return {
            /**
             * Property, that stores widgets objects.
             */
            widgets: guiDashboard.widgets,
            /**
             * Property, that stores widgets' data.
             */
            widgets_data: {},
        };
    },
    watch: {
        /**
         * Updates widgets' data, when chart widget period was changed.
         * @param value
         */
        'widgets.pmwChartWidget.period': function(value) {
            this.setWidgetsData().then(data => {
                this.widgets_data = data;
            });
        }
    },
    created() {
        this.fetchData();
    },
    computed: {
        title() {
            return 'Dashboard';
        },
        /**
         * Property, that returns array with sorted widgets.
         * @return {array}
         */
        sorted_widgets() {
            return Object.values(this.widgets).sort((a, b) => {
                return a.sort - b.sort;
            });
        },
    },
    methods: {
        /**
         * Method, that gets data for a current view.
         */
        fetchData() {
            this.initLoading();

            this.getWidgetsData().then(data => {
                this.widgets_data = data;
                this.setLoadingSuccessful();
                this.startAutoUpdate();
            }).catch(error => {
                debugger;
                this.setLoadingError(error);
            });
        },
        /**
         * Redefinition of 'getAutoUpdateInterval' method of view_with_autoupdate_mixin.
         */
        getAutoUpdateInterval() {
            return 15000;
        },
        /**
         * Redefinition of 'updateData' method of view_with_autoupdate_mixin.
         */
        updateData() {
            return this.setWidgetsData().then(data => {
                if(!deepEqual(this.widgets_data, data)) {
                    this.widgets_data = data;
                }

                return data;
            });
        },
        /**
         * Method, that returns promise of getting widgets' data.
         */
        getWidgetsData() {
            let data = this.$store.getters.getWidgets(this.$route.path);

            if(data) {
                return Promise.resolve(data);
            }

            return this.setWidgetsData();
        },
        /**
         * Method, that returns promise of setting widgets' data in store.
         */
        setWidgetsData() {
            return this.loadStats().then(response => {
                let exclude_stats = ['jobs'];
                let w_data = {};

                for(let key in response.data) {
                    if(exclude_stats.includes(key)) {
                        w_data['pmwChartWidget'] = response.data[key];
                    }

                    w_data['pmw' + capitalizeString(key) + 'Counter'] = response.data[key];
                }

                this.$store.commit('setWidgets', {
                    url: this.$route.path,
                    data: w_data,
                });

                return w_data;
            });
        },
        /**
         * Method, that loads stats - dict with widgets data.
         */
        loadStats() {
            return app.api.bulkQuery(this.formBulkStats());
        },
        /**
         * Method, that returns bulk for stats query.
         */
        formBulkStats() {
            return {
                type: 'get',
                item: 'stats',
                filters: "last=" + this.widgets.pmwChartWidget.period.query_amount,
            };
        },
    },
};

tabSignal.connect('app.afterInit', (obj) => {
    let app = obj.app;
    let setting_view = app.views["/profile/settings/"];
    let qs = setting_view.objects.clone();
    let f_obj = {};
    f_obj[path_pk_key] = my_user_id;
    // qs.url = qs.url.format({pk:my_user_id}).replace(/^\/|\/$/g, "");
    qs.url = qs.url.format(f_obj).replace(/^\/|\/$/g, "");

    qs.get().then(instance => {
        guiDashboard.updateSettings(instance.data);

        let qs_1 = app.application.$store.getters.getQuerySet(qs.url);
        if(!qs_1) {
            app.application.$store.commit('setQuerySet', {
                url: qs.url,
                queryset: qs,
            })
        }

        tabSignal.connect('GuiCustomizer.skin.name.changed', guiCustomizerSkinOnChangeHandler);
        tabSignal.connect('GuiCustomizer.skins_custom_settings.saved', guiCustomizerCustomSettingsOnSaveHandler);
        tabSignal.connect('GuiCustomizer.skins_custom_settings.reseted', guiCustomizerCustomSettingsOnSaveHandler);
    });
});

/**
 * Function, that returns QuerySet for profile/setting page.
 */
function getProfileSettingQsFromStore() {
    let qs = app.application.$store.getters.getQuerySet('user/' + my_user_id + '/settings');

    if(!qs) {
        return;
    }

    return qs.copy();
}

/**
 * Function, that updates data of QuerySet for profile/setting page
 * and saves updated queryset in store.
 * @param {object} qs QuerySet for profile/setting page
 */
function updateProfileSettingsQsAndSave(qs) {
    qs.formQueryAndSend('post', qs.cache.data).then(response => {
        app.application.$store.commit('setQuerySet', {
            url: qs.url,
            queryset: qs,
        });
    }).catch(error => {
        debugger;
    });
}

/**
 * This function is supposed to be called from 'GuiCustomizer.skin.name.changed' tabSignal.
 * This function updates selected skin and saves ProfileSettings QuerySet.
 * @param {object} customizer GuiCustomizer instance.
 */
function guiCustomizerSkinOnChangeHandler(customizer) {
    let qs = getProfileSettingQsFromStore();

    if(!qs) {
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

    if(!qs) {
        return;
    }

    qs.cache.data.skinsSettings = customizer.skins_custom_settings;

    return updateProfileSettingsQsAndSave(qs);
}