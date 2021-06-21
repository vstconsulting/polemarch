spa.signals.once('allModels.created', ({ models }) => {
    const OneProject = models.get('OneProject');
    OneProject.fields.get('execute_view_data').hidden = true;
});

const executingViews = ['/project/{id}/execute_module/', '/project/{id}/execute_playbook/'];

spa.signals.once('allViews.created', ({ views }) => {
    const HideNotRequiredMixin = {
        data: () => ({ hideNotRequired: true }),
    };
    for (const path of executingViews) {
        const view = views.get(path);
        view.mixins.push(HideNotRequiredMixin);
    }
});
