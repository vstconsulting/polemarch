/** @vue/component */
const OptionCreatePageMixin = {
    data() {
        return {
            templateKind: null,
        };
    },
    computed: {
        data() {
            return {
                ...this.$store.getters[this.storeName + '/sandbox'],
                kind: this.templateKind,
            };
        },
    },
    methods: {
        async fetchData() {
            this.initLoading();
            try {
                const template = await this.$app.views
                    .get('/project/{id}/execution_templates/')
                    .objects.get(this.params.execution_templates_id, this.params);
                this.templateKind = template.kind;
            } catch (e) {
                this.$app.error_handler.defineErrorAndShow(e);
            }
            await spa.components.page.PageNewViewComponent.methods.fetchData.call(this);
            this.setLoadingSuccessful();
        },
    },
};

spa.signals.once('allViews.created', ({ views }) => {
    const optionCreatePage = views.get(
        '/project/{id}/execution_templates/{execution_templates_id}/option/new/',
    );
    optionCreatePage.mixins.push(OptionCreatePageMixin);
});

spa.signals.once('app.afterInit', ({ app }) => {
    ['OneExecutionTemplate', 'CreateExecutionTemplate', 'CreateTemplateOption', 'OneTemplateOption']
        .map((modelName) => app.modelsResolver.get(modelName))
        .flatMap((model) => Object.values(model.fields.get('data').types))
        .forEach((field) => (field.nestedModel.fields.get('vars').hideNotRequired = true));
});
