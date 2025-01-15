<template>
    <Card :title="$t('Tasks history')" :loading="!jobs" class="card-info">
        <template #tools>
            <div class="form-inline">
                <label for="period-selector">{{ $t('Period') }}&nbsp;</label>
                <select id="period-selector" class="form-control" @change="changePeriod">
                    <option
                        v-for="(period, idx) in availablePeriods"
                        :key="idx"
                        :value="idx"
                        :selected="selectedPeriodIdx === idx"
                    >
                        {{ $t(period.label) }}
                    </option>
                </select>
            </div>
        </template>
        <div class="row">
            <div class="col-lg-8">
                <canvas ref="tasksChart" />
            </div>
            <div class="col-lg-4">
                <h5 class="text-center" style="margin-top: 20px">
                    {{ $t('Statistics') }}
                </h5>
                <div v-for="line in progressBarData" :key="line.name" class="progress-group">
                    {{ line.label }}
                    <span class="float-right">
                        <span>
                            <b>{{ line.sum }}</b>
                            /
                            {{ line.all }}
                        </span>
                    </span>
                    <div class="progress progress-sm">
                        <div
                            class="progress-bar"
                            :style="{
                                width: `${line.width}%`,
                                backgroundColor: `${line.borderColor} !important`,
                            }"
                        />
                    </div>
                </div>
            </div>
        </div>
    </Card>
</template>

<script>
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const PERIODS = [
    { label: 'last 3 years', queryAmount: 1095, amount: 3, type: 'year' },
    { label: 'last year', queryAmount: 365, amount: 13, type: 'month' },
    { label: 'last 3 months', queryAmount: 90, amount: 3, type: 'month' },
    { label: 'last month', queryAmount: 30, amount: 30, type: 'day' },
    { label: 'last 2 weeks', queryAmount: 14, amount: 14, type: 'day' },
    { label: 'last week', queryAmount: 7, amount: 7, type: 'day' },
    { label: 'last 3 days', queryAmount: 3, amount: 3, type: 'day' },
];

const LINES = [
    { name: 'all_tasks', borderColor: '#1f77b4', backgroundColor: 'rgba(31, 119, 180, 0.3)' },
    { name: 'ok', borderColor: 'rgba(39,105,0,1)', backgroundColor: 'rgba(39,105,0,0.3)' },
    { name: 'error', borderColor: 'rgba(220,53,69,1)', backgroundColor: 'rgba(220,53,69,0.3)' },
    { name: 'interrupted', backgroundColor: 'rgba(155,151,228,0.3)', borderColor: 'rgba(155,151,228,1)' },
    { name: 'delay', backgroundColor: 'rgba(128,132,25,0.3)', borderColor: 'rgba(128,132,25,1)' },
    { name: 'offline', backgroundColor: 'rgba(158,158,158,0.3)', borderColor: 'rgba(158,158,158,1)' },
];
for (const line of LINES) {
    line.label = line.name.replace('_', ' ').toUpperCase();
}

export default {
    components: {
        Card: spa.components.Card,
    },
    props: {
        jobs: { type: Object, default: undefined },
    },
    data() {
        return {
            tasksChart: null,
            availablePeriods: PERIODS,
            selectedPeriodIdx: null,
            dateFormat: 'DD.MM.YY',
            lines: LINES,
        };
    },
    computed: {
        selectedPeriod() {
            return this.availablePeriods[this.selectedPeriodIdx];
        },
        labels() {
            const labels = [];
            const startTime = this.getChartStartTime();

            for (let i = -1; i < this.selectedPeriod.amount; i++) {
                let time = +window
                    .moment(startTime)
                    .add(i, this.selectedPeriod.type)
                    .tz(app.api.getTimeZone())
                    .format('x');
                time = window.moment(time).tz(app.api.getTimeZone()).format(this.dateFormat);
                labels.push(time);
            }

            return labels;
        },
        progressBarData() {
            let all = 0;
            const data = {};

            for (const line of this.lines) {
                if (line.name === 'all_tasks') {
                    continue;
                }
                data[line.name] = {
                    all: all,
                    sum: 0,
                    status: line.name.toUpperCase(),
                    ...line,
                };
            }

            const keys = Object.keys(data);

            if (this.jobs?.year) {
                const stats = this.jobs?.year;
                for (const record of stats) {
                    const status = record.status.toLowerCase();
                    if (!data[status]) {
                        continue;
                    }
                    data[status].sum += record.sum;
                }
                for (const key of keys) {
                    all += data[key].sum;
                }
                for (const key of keys) {
                    data[key].all = all;
                }
            }

            for (const obj of Object.values(data)) {
                obj.width = Math.round((obj.sum / obj.all) * 100) || 0;
            }

            return data;
        },
    },
    watch: {
        jobs: { handler: 'updateChart', immediate: true },
        selectedPeriod(newPeriod, period) {
            if (newPeriod?.queryAmount !== period?.queryAmount) {
                this.$emit('request-data', newPeriod.queryAmount);
            }
            if (newPeriod?.label !== period?.label) {
                this.updateChart();
            }
        },
    },
    created() {
        this.selectedPeriodIdx = Number.parseInt(
            window.localStorage.getItem('dashboard.selectedPeriodIdx') || '4',
        );
    },
    methods: {
        updateChart() {
            if (!this.jobs) {
                return;
            }
            if (this.tasksChart) {
                this.tasksChart.data = this.getChartData();
                this.tasksChart.update();
            } else {
                this.tasksChart = new Chart(this.$refs.tasksChart, {
                    type: 'line',
                    data: this.getChartData(),
                    options: {
                        scales: {
                            y: { beginAtZero: true },
                        },
                    },
                });
            }
        },
        changePeriod(event) {
            const parsed = Number.parseInt(event.target.value);
            this.selectedPeriodIdx = Number.isNaN(parsed) ? 0 : parsed;
            if ('localStorage' in window) {
                localStorage.setItem('dashboard.selectedPeriodIdx', this.selectedPeriodIdx);
            }
        },
        getChartData() {
            return {
                labels: this.labels,
                datasets: this.lines.map((line) => this.getChartLine(this.labels, line)),
            };
        },
        getChartLine(labels, line) {
            const data = {};

            for (let index = 0; index < labels.length; index++) {
                data[labels[index]] = 0;
            }

            for (let index = 0; index < this.jobs[this.selectedPeriod.type].length; index++) {
                const item = this.jobs[this.selectedPeriod.type][index];

                let time = +window
                    .moment(item[this.selectedPeriod.type])
                    .tz(app.api.getTimeZone())
                    .format('x');
                time = window.moment(time).tz(app.api.getTimeZone()).format(this.dateFormat);

                if (data[time] === undefined) {
                    continue;
                }

                if (line.name.toLowerCase() === 'all_tasks') {
                    data[time] = item.all;
                } else if (line.name.toLowerCase() === item.status.toLowerCase()) {
                    data[time] = item.sum;
                }
            }

            return {
                ...line,
                data: Object.values(data).map((item) => Number(item)),
            };
        },
        getChartStartTime() {
            const now = window.moment();
            const monthNum = now.format('MM');
            const yearNum = now.format('YYYY');
            const dayNum = now.format('DD');
            const hourNum = 'T00:00:00';
            let startTimeOrg = '';

            switch (this.selectedPeriod.type) {
                case 'year':
                    startTimeOrg = `${yearNum}-01-01${hourNum}`;
                    break;
                case 'month':
                    startTimeOrg = `${yearNum}-${monthNum}-01${hourNum}`;
                    break;
                case 'day':
                    startTimeOrg = `${yearNum}-${monthNum}-${dayNum}${hourNum}`;
                    break;
            }

            return Number(
                window.moment
                    .utc(startTimeOrg)
                    .subtract(this.selectedPeriod.amount - 1, this.selectedPeriod.type)
                    .tz(app.api.getTimeZone())
                    .format('x'),
            );
        },
    },
};
</script>
