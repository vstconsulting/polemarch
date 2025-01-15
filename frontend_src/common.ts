import { onAppAfterInit, onAppCreated, onSchemaViewsCreated, spa } from '@vstconsulting/vstutils';
import { computed, ref } from 'vue';

import './style.scss';
import './layout';
import './hooks';
import './users';
import './inventory';
import './project';
import './history';

import Home from './Home.vue';
import { UserObjectField } from './fields/UserObjectField';

onSchemaViewsCreated(({ views }) => {
    const homeView = new spa.views.View(
        // @ts-expect-error vstutils types are not perfect
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
        const statsData = ref();
        const period = ref(14);
        const smallBoxes = ref([
            { key: 'projects', label: 'Projects', href: '#/project', icon: 'fa fa-cog' },
            { key: 'users', label: 'Users', href: '#/user', icon: 'fa fa-cog' },
            { key: 'inventories', label: 'Inventories', href: '#/inventory', icon: 'fas fa-cog' },
            { key: 'inventory_plugins', label: 'Inventory plugins', icon: 'fas fa-cog' },
            { key: 'execution_plugins', label: 'Execution plugins', icon: 'fas fa-cog' },
        ]);
        const additionalSections = computed(() => []);

        async function updateData(requestPeriod?: number) {
            const finalPeriod = requestPeriod || period.value;
            const response = await app.api.makeRequest({
                useBulk: true,
                method: 'get',
                path: 'stats',
                auth: true,
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

onAppCreated((app) => {
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

onAppAfterInit(({ app }) => {
    app.views.get('/group/{id}/groups/{groups_id}/hosts/').nestedQueryset = app.views.get('/host/').objects;
});

class BooleanField extends spa.fields.boolean.BooleanField {
    getInitialValue(): undefined {
        return undefined;
    }
}

onAppCreated((app) => {
    app.fieldsResolver.registerField(
        'boolean',
        app.fieldsResolver._types.get('boolean').keys().next().value,
        BooleanField,
    );
});
