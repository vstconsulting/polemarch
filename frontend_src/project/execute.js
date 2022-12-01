export function setupExecuteViews() {
    const HideNotRequiredMixin = {
        data: () => ({ hideNotRequired: true }),
    };
    spa.signals.once('allViews.created', ({ views }) => {
        for (const [path, view] of views) {
            if (path.startsWith('/project/{id}/execute_')) {
                view.mixins.push(HideNotRequiredMixin);
            }
        }
    });
}
