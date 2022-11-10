spa.signals.once('allViews.created', ({ views }) => {
    const optionCreatePage = views.get(
        '/project/{id}/execution_templates/{execution_templates_id}/option/new/',
    );
    optionCreatePage.extendStore((store) => {
        const app = spa.getApp();

        async function fetchData() {
            const route = app.router.currentRoute;
            store.initLoading();
            await store.fetchData();
            try {
                const template = await app.views
                    .get('/project/{id}/execution_templates/')
                    .objects.get(route.params.execution_templates_id, route.params);
                store.sandbox.value.kind = template.kind;
            } catch (e) {
                app.error_handler.defineErrorAndShow(e);
            }
            store.setLoadingSuccessful();
        }

        return {
            ...store,
            fetchData,
        };
    });
});

spa.signals.once('app.afterInit', ({ app }) => {
    ['OneExecutionTemplate', 'CreateExecutionTemplate', 'CreateTemplateOption', 'OneTemplateOption']
        .map((modelName) => app.modelsResolver.get(modelName))
        .flatMap((model) => Object.values(model.fields.get('data').types))
        .forEach((field) => (field.nestedModel.fields.get('vars').hideNotRequired = true));
});
