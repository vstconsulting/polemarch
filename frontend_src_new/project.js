spa.signals.once('allModels.created', ({ models }) => {
    const OneProject = models.get('OneProject');
    OneProject.fields.get('execute_view_data').hidden = true;
});
