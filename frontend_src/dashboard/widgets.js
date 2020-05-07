import HistoryChartWidget from './HistoryChartWidget.js';

/**
 * Dashboard counter widgets
 */
export const pmwTemplatesCounter = new spa.dashboard.CounterWidget({
    name: 'pmwTemplatesCounter',
    title: 'templates counter',
    sort: 1,
    active: true,
});
export const pmwProjectsCounter = new spa.dashboard.CounterWidget({
    name: 'pmwProjectsCounter',
    title: 'projects counter',
    sort: 2,
    active: true,
    url: '/project',
});
export const pmwInventoriesCounter = new spa.dashboard.CounterWidget({
    name: 'pmwInventoriesCounter',
    title: 'inventories counter',
    sort: 3,
    active: true,
    url: '/inventory',
});
export const pmwGroupsCounter = new spa.dashboard.CounterWidget({
    name: 'pmwGroupsCounter',
    title: 'groups counter',
    sort: 4,
    active: true,
    url: '/group',
});
export const pmwHostsCounter = new spa.dashboard.CounterWidget({
    name: 'pmwHostsCounter',
    title: 'hosts counter',
    sort: 5,
    active: true,
    url: '/host',
});
export const pmwUsersCounter = new spa.dashboard.CounterWidget({
    name: 'pmwUsersCounter',
    title: 'users counter',
    sort: 6,
    active: true,
    url: '/user',
});

/**
 * Dashboard history `chart` widget
 */
export const pmwChartWidget = new HistoryChartWidget({
    name: 'pmwChartWidget',
    title: 'Tasks history',
    sort: 7,
    lines: {
        all_tasks: {
            name: 'all_tasks',
            // title: "All tasks",
            color: '#1f77b4',
            bg_color: 'rgba(31, 119, 180, 0.3)',
            active: true,
        },
        ok: {
            name: 'ok',
            title: 'OK',
            color: '#276900',
            bg_color: 'rgba(39, 105, 0, 0.3)',
            active: true,
        },
        error: {
            name: 'error',
            title: 'ERROR',
            color: '#dc3545',
            bg_color: 'rgba(220, 53, 69, 0.3)',
            active: true,
        },
        interrupted: {
            name: 'interrupted',
            title: 'INTERRUPTED',
            color: '#9b97e4',
            bg_color: 'rgba(155, 151, 228, 0.3)',
            active: true,
        },
        delay: {
            name: 'delay',
            title: 'DELAY',
            color: '#808419',
            bg_color: 'rgba(128, 132, 25, 0.3)',
            active: true,
        },
        offline: {
            name: 'offline',
            title: 'OFFLINE',
            color: '#9e9e9e',
            bg_color: 'rgba(158, 158, 158, 0.3)',
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
});

export const widgets = {
    pmwTemplatesCounter,
    pmwProjectsCounter,
    pmwInventoriesCounter,
    pmwGroupsCounter,
    pmwHostsCounter,
    pmwUsersCounter,
    pmwChartWidget,
};
