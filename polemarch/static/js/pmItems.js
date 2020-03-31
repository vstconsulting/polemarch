/**
 * Redefinition of logo Vue component.
 */
vst_vue_components.items.logo = spa.globalComponentsRegistrator.add({
    name: 'logo',
    template: "#template_logo_pm",
    computed: {
        /**
         * Property, that returns path to directory with static files.
         * @returns {string}.
         */
        staticPath() {
            return window.guiStaticPath || "/static/";
        },
    },
});

/**
 * Component for guiWidgets.history_chart.
 */
vst_vue_components.widgets.w_history_chart = Vue.component('w_history_chart', {
    mixins: [w_line_chart_mixin], /* globals w_line_chart_mixin */
    data() {
        return {
            with_content_header: true,
        };
    },
    components: {
        content_header: {
            mixins: [base_widget_mixin], /* globals base_widget_mixin */
            template: "#template_w_history_chart_content_header",
            data() {
                return {
                    period_options: [
                        { value: 1095, title: 'last 3 years' },
                        { value: 365,  title: 'last year' },
                        { value: 90,   title: 'last 3 months' },
                        { value: 30,   title: 'last month' },
                        { value: 14,   title: 'last 2 weeks' },
                        { value: 7,    title: 'last week' },
                        { value: 3,    title: 'last 3 days' },
                    ],
                };
            },
            methods: {
                /**
                 * Method returns true, if option is selected.
                 * @param {object} option Parameters of period option.
                 * @return {boolean}
                 */
                isOptionSelected(option) {
                    return option.value == this.item.period.query_amount;
                },
                /**
                 * Method - onChange callback for period select el.
                 * @param {string} value Selected value.
                 */
                onChangeHandler(value) {
                    this.item.setChartPeriod(value);
                }
            },
        },
        content_body: {
            mixins: [w_line_chart_content_body_mixin], /* globals w_line_chart_content_body_mixin */
            template: "#template_w_history_chart_content_body",
            data() {
                return {
                    chart_instance: undefined,
                    customizer: guiCustomizer,
                };
            },
            watch: {
                'customizer.skin.name': function(value) { /* jshint unused: false */
                    this.updateChartData();
                }
            },
            computed: {
                /**
                 * Property, that returns data for Progress bars.
                 * @returns {Object}
                 */
                progressBarsData() {
                    return this.item.getProgressBarsData(this.value);
                }
            },
            methods: {
                /**
                 * Method, that returns styles for progress bar.
                 * @param {object} stats Progress bar data.
                 * @returns {String}
                 */
                getProgressBarStyles(stats) {
                    let width = stats.sum / stats.all * 100;
                    let line = this.item.lines[stats.status.toLowerCase()];
                    let bgc = this.item._getChartLineColor(line);

                    return 'width: {0}%; background-color: {1}!important;'.format([width, bgc]);
                }
            },
        },
    },
});