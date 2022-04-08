import { InventoryField } from '../inventory';

const periodicTaskInventoryField = {
    type: 'string',
    format: 'dynamic',
    'x-options': {
        field: ['kind'],
        callback({ kind }) {
            if (kind === 'TEMPLATE') {
                return { type: 'string', format: 'hidden' };
            }
            return { type: 'string', format: InventoryField.format };
        },
    },
};

const templateOptionField = (template) => ({
    type: 'string',
    format: 'fk',
    'x-options': {
        value_field: 'id',
        view_field: 'id',
        makeLink: true,
        querysets: new Map([
            [
                '/project/{id}/periodic_task/{periodic_task_id}/',
                [
                    window.app.views
                        .get('/project/{id}/execution_templates/{execution_templates_id}/option/')
                        .objects.formatPath({
                            project: window.app.router.currentRoute.params.id,
                            execution_templates_id:
                                typeof template === 'object' ? template.getPkValue() : template,
                        }),
                ],
            ],
        ]),
        dependence: {
            template: 'template',
        },
        model: {
            $ref: '#/definitions/TemplateOption',
        },
    },
});

export function setupPeriodicTasks() {
    spa.signals.connect('openapi.loaded', (schema) => {
        const periodicTasksPath = schema.paths['/project/{id}/periodic_task/'];

        const periodicTasksListModelName =
            periodicTasksPath.get.responses[200].schema.properties.results.items.$ref.split('/').at(-1);

        const periodicTaskCreateModelName = periodicTasksPath.post.parameters[0].schema.$ref
            .split('/')
            .at(-1);

        schema.definitions[periodicTasksListModelName].properties.inventory = periodicTaskInventoryField;
        schema.definitions[periodicTaskCreateModelName].properties.inventory = periodicTaskInventoryField;

        schema.definitions[periodicTaskCreateModelName].properties.template_opt = {
            type: 'string',
            format: 'dynamic',
            'x-options': {
                field: ['template'],
                callback: ({ template }) =>
                    template ? templateOptionField(template) : { type: 'string', format: 'hidden' },
            },
        };

        spa.signals.connect('filter.fk.TemplateOption.template_opt', function (params) {
            params.nest_prom = params.qs
                .formatPath({ execution_templates_id: params.dependenceFilters.template })
                .items();
        });
    });

    spa.signals.connect('allViews.created', ({ views }) => {
        const mixin = {
            computed: {
                fieldsGroups() {
                    return [
                        {
                            title: 'Schedule',
                            fields: ['enabled', 'type', 'schedule'],
                            wrapperClasses: 'col-12',
                        },
                        {
                            title: '',
                            fields: ['name', 'notes'],
                        },
                        {
                            title: 'Execute parameters',
                            fields: ['kind', 'mode', 'inventory', 'template', 'template_opt', 'save_result'],
                        },
                    ];
                },
            },
        };
        for (const path of [
            '/project/{id}/periodic_task/new/',
            '/project/{id}/periodic_task/{periodic_task_id}/',
            '/project/{id}/periodic_task/{periodic_task_id}/edit/',
        ]) {
            const view = views.get(path);
            view.mixins.push(mixin);
        }
    });
}
