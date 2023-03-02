import { ref, computed } from 'vue';
import './style.scss';
import './layout';
import './hooks';
import './users';
import * as inventory from './inventory';
import './project';
import * as history from './history';

import Home from './Home.vue';
import { UserObjectField } from './fields/UserObjectField';

export { inventory, history };

spa.signals.once('allViews.created', ({ views }) => {
    const homeView = new spa.views.View(
        { path: '/', routeName: 'home', title: 'Dashboard', autoupdate: true },
        null,
        [Home],
    );
    homeView.subscriptionLabels = [
        '/project/{id}/execution_templates/',
        '/project/',
        '/inventory/',
        '/group/',
        '/host/',
        '/user/',
        '/history/',
    ].flatMap((path) => views.get(path).subscriptionLabels);
    views.set('/', homeView);
    homeView.extendStore((store) => {
        const app = spa.getApp();
        let statsData = ref(null);
        let period = ref(14);
        let smallBoxes = ref([
            { key: 'projects', label: 'Projects', href: '#/project', icon: 'fa fa-cog' },
            { key: 'users', label: 'Users', href: '#/user', icon: 'fa fa-cog' },
            { key: 'inventories', label: 'Inventories', href: '#/inventory', icon: 'fas fa-cog' },
            { key: 'execution_plugins', label: 'Execution plugins', icon: 'fas fa-cog' },
        ]);
        const additionalSections = computed(() => []);

        async function updateData(requestPeriod) {
            const finalPeriod = requestPeriod || period.value;
            const response = await app.api.makeRequest({
                useBulk: true,
                method: 'get',
                path: 'stats',
                query: { last: finalPeriod },
            });
            if (response.status !== 200) {
                console.warn(response);
                return;
            }
            if (JSON.stringify(statsData.value) !== JSON.stringify(response.data)) {
                statsData.value = response.data;
            }
            period.value = finalPeriod;
        }

        return {
            ...store,
            statsData,
            period,
            smallBoxes,
            additionalSections,
            updateData,
        };
    });
});

spa.signals.once('APP_CREATED', (app) => {
    const ownerField = {
        type: 'string',
        format: UserObjectField.format,
    };

    const definitions = app.schema.definitions;
    for (const modelName in definitions) {
        if (definitions[modelName].properties?.owner?.$ref) {
            definitions[modelName].properties.owner = ownerField;
        }
    }
});

spa.signals.connect('app.afterInit', ({ app }) => {
    app.views.get('/group/{id}/groups/{groups_id}/hosts/').nestedQueryset = app.views.get('/host/').objects;
});
