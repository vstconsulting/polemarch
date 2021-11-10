/** @vue/component */
import RunPlaybook from './RunPlaybook.vue';

const ProjectDetailViewMixin = {
    computed: {
        beforeFieldsGroupsComponent() {
            return RunPlaybook;
        },
        modelsFieldsWrapperClasses() {
            return 'col-md-6';
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
