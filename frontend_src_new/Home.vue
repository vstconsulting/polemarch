<template>
    <div class="container-fluid pt-3">
        <div class="row">
            <div v-for="box in smallBoxes" :key="box.key" class="col-6 col-lg-2">
                <SmallBoxWidget
                    :value="smallBoxesValues[box.key]"
                    :label="$u.capitalize($tc(box.key + ' counter', smallBoxesValues[box.key]))"
                    :href="box.href"
                    :icon-class="box.icon"
                    :loading="isLoading"
                />
            </div>
        </div>
        <div class="row">
            <div class="col">
                <TasksChart :jobs="jobs" @request-data="updateData($event)" />
            </div>
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
        mixins: [spa.views.mixins.BasestViewMixin],
        data() {
            return {
                statsData: null,
                smallBoxes: [
                    { key: 'templates', label: 'Templates', icon: 'fa fa-cog' },
                    { key: 'projects', label: 'Projects', href: '#/project', icon: 'fa fa-cog' },
                    { key: 'inventories', label: 'Inventories', href: '#/inventory', icon: 'fas fa-cog' },
                    { key: 'groups', label: 'Groups', href: '#/groups', icon: 'fa fa-cog' },
                    { key: 'hosts', label: 'Hosts', href: '#/host', icon: 'fa fa-cog' },
                    { key: 'users', label: 'Users', href: '#/user', icon: 'fa fa-cog' },
                ],
                period: 14,
            };
        },
        computed: {
            title() {
                return this.$t('Dashboard');
            },
            isLoading() {
                return !this.statsData;
            },
            smallBoxesValues() {
                return Object.fromEntries(
                    this.smallBoxes.map(({ key }) => [key, this.statsData?.[key] || 0]),
                );
            },
            jobs() {
                return this.statsData?.jobs;
            },
        },
        methods: {
            updateData(period = 14) {
                return this.$app.api
                    .makeRequest({ useBulk: true, method: 'get', path: 'stats', query: { last: period } })
                    .then((response) => {
                        if (response.status !== 200) {
                            console.warn(response);
                            return;
                        }
                        this.statsData = response.data;
                    });
            },
        },
    };
</script>
