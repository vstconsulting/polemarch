import './style.scss';

/** @vue/component */
import RunPlaybook from './RunPlaybook.vue';

export function setupProjectDetailView() {
    spa.signals.once('allViews.created', ({ views }) => {
        const detailView = views.get('/project/{id}/');
        detailView.objects.getResponseModelClass(spa.utils.RequestTypes.RETRIEVE).fieldsGroups = () => {
            const groups = [
                {
                    title: 'General',
                    wrapperClasses: 'col-md-5',
                    fields: ['id', 'name', 'repository', 'status', 'revision', 'branch', 'owner', 'notes'],
                },
            ];
            if (app.store.page.instance?.readme_content) {
                groups.push({
                    title: 'Info',
                    wrapperClasses: app.store.page.instance.execute_view_data?.playbooks
                        ? 'col-md-12'
                        : 'col-md-7',
                    fields: ['readme_content'],
                });
            }
            if (app.store.page.instance?.execute_view_data?.playbooks) {
                groups.push({
                    title: 'Quick playbook execution form',
                    wrapperClasses: 'col-md-7',
                    fields: ['execute_view_data'],
                });
            }
            return groups;
        };
    });
}

export class RunPlaybookField extends spa.fields.base.BaseField {
    static format = 'run-playbook';
    constructor(options) {
        super(options);
        this.readOnly = true;
    }
    static get mixins() {
        return [RunPlaybook];
    }
}

spa.signals.once('APP_CREATED', (app) => {
    app.fieldsResolver.registerField('string', RunPlaybookField.format, RunPlaybookField);
});

spa.signals.once(`models[OneProject].fields.beforeInit`, (fields) => {
    fields.execute_view_data = {
        type: 'string',
        format: RunPlaybookField.format,
    };
});
