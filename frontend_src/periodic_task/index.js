import './style.scss';
import { hideListColumns } from '../history';

hideListColumns('Periodictask', ['mode', 'inventory', 'template', 'template_opt']);

const fetchKindMixin = {
    data() {
        return {
            kind: null,
        };
    },
    methods: {
        fetchKind() {
            return this.$app.views
                .get('/project/{id}/periodic_task/')
                .objects.formatPath(this.$route.params)
                .get(this.$route.params.periodic_task_id)
                .then((task) => task.kind)
                .catch((error) => {
                    this.setLoadingError(error || {});
                });
        },
        onCreatedHandler() {
            this.fetchData()
                .then(() => this.fetchKind())
                .then((kind) => {
                    this.commitMutation('setFieldValue', { field: 'kind', value: kind });
                });
        },
    },
};

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

    variablesCreatePage.mixins.push(fetchKindMixin);
});

const HideSublinksMixin = {
    computed: {
        sublinks() {
            return Array.from(this.view.sublinks.values()).filter((sublink) => {
                if (sublink.name === 'variables') {
                    return this.data.kind === 'MODULE' || this.data.kind === 'PLAYBOOK';
                }
                return true;
            });
        },
    },
};

spa.signals.once('allViews.created', ({ views }) => {
    const periodicTaskPage = views.get('/project/{id}/periodic_task/{periodic_task_id}/');
    periodicTaskPage.mixins.push(HideSublinksMixin);
});
