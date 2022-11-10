import { computed } from 'vue';
import './style.scss';
import { hideListColumns } from '../history';

hideListColumns('Periodictask', ['mode', 'inventory', 'template', 'template_opt']);

spa.signals.once('allViews.created', ({ views }) => {
    const variablesCreatePage = views.get('/project/{id}/periodic_task/{periodic_task_id}/variables/new/');
    const variablesEditPage = views.get(
        '/project/{id}/periodic_task/{periodic_task_id}/variables/{variables_id}/edit/',
    );
    const oneVariablesPage = views.get(
        '/project/{id}/periodic_task/{periodic_task_id}/variables/{variables_id}/',
    );
    const variablesListPage = views.get('/project/{id}/periodic_task/{periodic_task_id}/variables/');

    class VariablesQuerySet extends variablesListPage.objects.constructor {
        _getKind() {
            const params = app.router.currentRoute.params;
            return window.app.views
                .get('/project/{id}/periodic_task/')
                .objects.get(params.periodic_task_id, { id: params.id })
                .then((task) => task.kind);
        }
        async get(...args) {
            const [variable, kind] = await Promise.all([super.get(...args), this._getKind()]);
            variable._data.kind = kind;
            return variable;
        }
        async items(...args) {
            const [variables, kind] = await Promise.all([super.items(...args), this._getKind()]);
            for (const variable of variables) {
                variable._data.kind = kind;
            }
            return variables;
        }
    }

    for (const view of [variablesEditPage, oneVariablesPage, variablesListPage]) {
        view.objects = new VariablesQuerySet(
            view.objects.pattern,
            view.objects.models,
            {},
            view.objects.pathParams,
        );
    }

    variablesCreatePage.extendStore((store) => {
        const app = spa.getApp();

        async function fetchKind() {
            try {
                const task = await app.views
                    .get('/project/{id}/periodic_task/')
                    .objects.formatPath(app.router.currentRoute.params)
                    .get(app.router.currentRoute.params.periodic_task_id);
                return task.kind;
            } catch (error) {
                store.setLoadingError(error || {});
            }
        }

        async function fetchData() {
            const [kind] = await Promise.all([fetchKind(), store.fetchData()]);
            store.setFieldValue({ field: 'kind', value: kind });
        }

        return {
            ...store,
            fetchData,
        };
    });
});

spa.signals.once('allViews.created', ({ views }) => {
    const periodicTaskPage = views.get('/project/{id}/periodic_task/{periodic_task_id}/');
    periodicTaskPage.extendStore((store) => {
        const sublinks = computed(() => {
            return store.sublinks.value.filter((sublink) => {
                if (sublink.name === 'variables') {
                    const data = store.instance.value;
                    return data?.kind === 'MODULE' || data?.kind === 'PLAYBOOK';
                }
                return true;
            });
        });
        return {
            ...store,
            sublinks,
        };
    });
});
