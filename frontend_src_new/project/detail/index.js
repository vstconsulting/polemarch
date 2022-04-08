/** @vue/component */
import RunPlaybook from './RunPlaybook.vue';

const ProjectDetailViewMixin = {
    computed: {
        beforeFieldsGroupsComponent() {
            return RunPlaybook;
        },
        fieldsGroups() {
            const groups = [
                {
                    title: '',
                    fields: [
                        'id',
                        'name',
                        'repository',
                        'status',
                        'revision',
                        'branch',
                        'owner',
                        'execute_view_data',
                    ],
                },
            ];
            if (this.data.readme_content || this.data.notes) {
                groups.unshift({ title: 'Info', fields: ['readme_content', 'notes'] });
            }
            return groups;
        },
    },
};

export function setupProjectDetailView() {
    spa.signals.once('allModels.created', ({ models }) => {
        const OneProject = models.get('OneProject');
        OneProject.fields.get('execute_view_data').hidden = true;
    });

    spa.signals.once('allViews.created', ({ views }) => {
        const detailView = views.get('/project/{id}/');
        detailView.mixins.push(ProjectDetailViewMixin);
    });
}
