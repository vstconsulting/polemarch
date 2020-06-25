<template>
    <div class="row">
        <div class="col-lg-8">
            <div style="position: relative; margin: auto; height: 300px; width: 100%; overflow: hidden;">
                <canvas id="chart_js_canvas"></canvas>
            </div>
        </div>
        <div class="col-lg-4">
            <div style="width: 100%;" class="text-data" id="chart_progress_bars">
                <h5 class="text-center" style="margin-top: 25px;">{{ $t('statistic') | capitalize }}</h5>
                <template v-for="(line, idx) in item.lines">
                    <template v-if="line.active && progressBarsData[line.name]">
                        <div :key="idx" class="progress-group">
                            {{ $t(line.name) }}
                            <span class="float-right">
                                <span>
                                    <transition name="slide-fade" mode="out-in">
                                        <span :key="progressBarsData[line.name].sum">
                                            <b>{{ progressBarsData[line.name].sum }}</b>
                                        </span>
                                    </transition>
                                </span>
                                <span>/</span>
                                <span>
                                    <span>
                                        {{ progressBarsData[line.name].all }}
                                    </span>
                                </span>
                            </span>
                            <div class="progress progress-sm">
                                <div
                                    class="progress-bar"
                                    :style="getProgressBarStyles(progressBarsData[line.name])"
                                ></div>
                            </div>
                        </div>
                    </template>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        mixins: [spa.components.mixins.LineChartContentBodyMixin],
        data() {
            return {
                chart_instance: undefined,
                customizer: spa.guiCustomizer.guiCustomizer,
            };
        },
        watch: {
            'customizer.skin.name': function (value) {
                /* jshint unused: false */
                this.updateChartData();
            },
        },
        computed: {
            /**
             * Property, that returns data for Progress bars.
             * @returns {Object}
             */
            progressBarsData() {
                return this.item.getProgressBarsData(this.value);
            },
        },
        methods: {
            /**
             * Method, that returns styles for progress bar.
             * @param {object} stats Progress bar data.
             * @returns {String}
             */
            getProgressBarStyles(stats) {
                let width = (stats.sum / stats.all) * 100;
                let line = this.item.lines[stats.status.toLowerCase()];
                let bgc = this.item._getChartLineColor(line);

                return 'width: {0}%; background-color: {1}!important;'.format([width, bgc]);
            },
        },
    };
</script>

<style scoped></style>
