<template>
    <div style="display: contents;">
        <transition name="fade">
            <div class="pull-right" id="period-list" style="" v-if="!item.collapsed">
                <div class="chart-period-select-wrapper">
                    <label
                        style="float: left; margin-right: 10px; line-height: 26px;"
                        id="chart-period-label"
                    >
                        {{ $t('period') | capitalize }}
                    </label>
                    <select
                        id="chart-period"
                        class="form-control chart-period-select"
                        aria-label="Chart Period"
                        @change="onChangeHandler($event.target.value)"
                        aria-labelledby="chart-period-label"
                    >
                        <option
                            v-for="(option, idx) in period_options"
                            :key="idx"
                            :value="option.value"
                            :selected="isOptionSelected(option)"
                        >
                            {{ $t(option.title) }}
                        </option>
                    </select>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
    export default {
        mixins: [spa.components.mixins.BaseWidgetMixin],
        data() {
            return {
                period_options: [
                    { value: 1095, title: 'last 3 years' },
                    { value: 365, title: 'last year' },
                    { value: 90, title: 'last 3 months' },
                    { value: 30, title: 'last month' },
                    { value: 14, title: 'last 2 weeks' },
                    { value: 7, title: 'last week' },
                    { value: 3, title: 'last 3 days' },
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
            },
        },
    };
</script>

<style scoped></style>
