export function setupExecuteViews() {
    const executingViews = ['/project/{id}/execute_module/', '/project/{id}/execute_playbook/'];
    const HideNotRequiredMixin = {
        data: () => ({ hideNotRequired: true }),
    };
    spa.signals.once('allViews.created', ({ views }) => {
        for (const path of executingViews) {
            const view = views.get(path);
            view.mixins.push(HideNotRequiredMixin);
        }
    });
}
