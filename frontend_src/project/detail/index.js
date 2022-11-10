import './style.scss';

/** @vue/component */
import RunPlaybook from './RunPlaybook.vue';

const ProjectDetailViewMixin = {
    computed: {
        fieldsGroups() {
            const groups = [
                {
                    title: 'General',
                    wrapperClasses: 'col-md-5',
                    fields: ['id', 'name', 'repository', 'status', 'revision', 'branch', 'owner'],
                },
            ];
            if (this.data.readme_content || this.data.notes) {
                groups.push({
                    title: 'Info',
                    wrapperClasses: this.data.execute_view_data?.playbooks ? 'col-md-12' : 'col-md-7',
                    fields: ['readme_content', 'notes'],
                });
            }
            if (this.data.execute_view_data?.playbooks) {
                groups.push({
                    title: 'Quick playbook execution form',
                    wrapperClasses: 'col-md-7',
                    fields: ['execute_view_data'],
                });
            }
            return groups;
        },
    },
};

export function setupProjectDetailView() {
    spa.signals.once('allViews.created', ({ views }) => {
        const detailView = views.get('/project/{id}/');
        detailView.mixins.push(ProjectDetailViewMixin);
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
