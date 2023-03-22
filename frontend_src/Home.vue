<template>
    <div class="container-fluid pt-3">
        <div class="row">
            <div v-for="box in store.smallBoxes" :key="box.key" class="col">
                <SmallBoxWidget
                    :value="smallBoxesValues[box.key]"
                    :label="$u.capitalize($tc(box.key + ' counter', smallBoxesValues[box.key]))"
                    :href="box.href"
                    :icon-class="box.icon"
                    :loading="store.loading"
                />
            </div>
        </div>
        <div class="row">
            <div class="col">
                <TasksChart :jobs="jobs" @request-data="store.updateData($event)" />
            </div>
        </div>
        <div class="row">
            <component :is="component" v-for="(component, idx) in store.additionalSections" :key="idx" />
        </div>
    </div>
</template>

<script>
    import { Chart, registerables } from 'chart.js';
    import TasksChart from './TasksChart.vue';
    Chart.register(...registerables);

    export default {
        components: {
            TasksChart,
            SmallBoxWidget: spa.components.widgets.SmallBoxWidget,
        },
        mixins: [spa.components.BaseViewMixin],
        computed: {
            smallBoxesValues() {
                return Object.fromEntries(
                    this.store.smallBoxes.map(({ key }) => [key, this.store.statsData?.[key] || 0]),
                );
            },
            jobs() {
                return this.store.statsData?.jobs;
            },
        },
    };
</script>
