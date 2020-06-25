<template>
    <div style="display: contents;">
        <preloader :show="loading"></preloader>

        <div class="content-wrapper-2" v-if="error">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    @click="goToHistoryRecord(-1)"
                                    class="btn btn-default btn-previous-page"
                                >
                                    <span class="fa fa-arrow-left"></span>
                                </span>
                                <span class="h1-header">
                                    {{ $t('error') | capitalize }} {{ error.status }}
                                </span>
                            </h1>
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12"></div>
                    </div>
                    <br />
                    <div class="row">
                        <section class="col-lg-12">
                            <div class="card card-info">
                                <div class="card-header with-border">
                                    <br />
                                </div>
                                <div class="card-body">
                                    {{ error_data }}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </div>

        <div class="content-wrapper-2" v-if="response">
            <section class="content-header">
                <div class="container-fluid">
                    <h1>
                        <span class="h1-header">{{ $t(title.toLowerCase()) | capitalize }}</span>
                    </h1>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row" id="dnd-container">
                        <component
                            v-for="widget in sorted_widgets"
                            :key="widget.name"
                            :is="widget.componentName"
                            :item="widget"
                            :value="widgets_data[widget.name]"
                        ></component>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
    import { widgets } from './widgets.js';

    export default {
        mixins: [spa.router.mixins.BasestViewMixin, spa.router.mixins.ViewWithAutoUpdateMixin],
        data() {
            return {
                /**
                 * Property, that stores widgets objects.
                 */
                widgets: widgets,
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
            'widgets.pmwChartWidget.period': function (value) {
                /* jshint unused: false */
                this.setWidgetsData().then((data) => {
                    this.widgets_data = data;
                });
            },
            /**
             * Saves widgets' data, when chart widget was collapsed/uncollapsed.
             * @param value
             */
            'widgets.pmwChartWidget.collapse': function (value) {
                this.saveWidgetSettingToApi('pmwChartWidget', 'collapse', value);
            },
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

                this.getWidgetsData()
                    .then((data) => {
                        this.widgets_data = data;
                        this.setLoadingSuccessful();
                        this.startAutoUpdate();
                    })
                    .catch((error) => {
                        debugger;
                        this.setLoadingError(error);
                    });
            },
            /**
             * Redefinition of 'updateData' method of view_with_autoupdate_mixin.
             */
            updateData() {
                return this.setWidgetsData().then((data) => {
                    if (!spa.utils.deepEqual(this.widgets_data, data)) {
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

                if (data) {
                    return Promise.resolve(data);
                }

                return this.setWidgetsData();
            },
            /**
             * Method, that returns promise of setting widgets' data in store.
             */
            setWidgetsData() {
                return this.loadStats().then((response) => {
                    let w_data = this.statsResponseToWidgetData(response);

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
                    method: 'get',
                    path: ['stats'],
                    query: 'last=' + this.widgets.pmwChartWidget.period.query_amount,
                };
            },
            /**
             * Method, that transforms API response with stats to widgets data.
             * @param {object} response API response object
             */
            statsResponseToWidgetData(response) {
                let w_data = {};
                let exclude_stats = ['jobs'];

                for (let key in response.data) {
                    if (!response.data.hasOwnProperty(key)) {
                        continue;
                    }

                    if (exclude_stats.includes(key)) {
                        w_data.pmwChartWidget = response.data[key];
                        continue;
                    }

                    w_data['pmw' + spa.utils.capitalizeString(key) + 'Counter'] = response.data[key];
                }

                return w_data;
            },
            /**
             * Method, that updates some property of widget and sends API request for saving updated User Settings.
             * @param {string} widget Widget name
             * @param {string} prop Widget's property name
             * @param {any} value New value of widget's property name
             */
            saveWidgetSettingToApi(widget, prop, value) {
                let qs = app.application.$store.state.objects['user/' + app.api.getUserId() + '/settings'];

                if (!qs) {
                    return;
                }

                let instance = qs.cache;

                if (!instance) {
                    return;
                }

                if (!instance.data) {
                    return;
                }

                if (!instance.data.widgetSettings) {
                    instance.data.widgetSettings = {};
                }

                if (!instance.data.widgetSettings[widget]) {
                    instance.data.widgetSettings[widget] = {};
                }

                let widget_setting_backup = { ...instance.data.widgetSettings[widget] };

                instance.data.widgetSettings[widget][prop] = value;

                let view = app.views['/user/{' + path_pk_key + '}/settings/edit/'];
                instance
                    .save(view.schema.query_type)
                    .then((instance) => {
                        guiDashboard.updateSettings(instance.data);
                    })
                    .catch((error) => {
                        /*jshint unused:false*/
                        instance.data.widgetSettings[widget] = widget_setting_backup;
                    });
            },
        },
    };
</script>

<style scoped></style>
