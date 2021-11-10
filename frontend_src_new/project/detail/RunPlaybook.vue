<template>
    <div v-if="executeData" class="col-md-6">
        <Card :title="$t('Quick playbook execution form')">
            <ModelFields
                :editable="true"
                :data="mainData"
                :model="AnsibleModule"
                :fields-groups="[{ title: '', fields: ['inventory', 'user', 'private_key'] }]"
                @set-value="({ field, value }) => $set(mainData, field, value)"
            />
            <ModelFields
                :editable="true"
                :data="argsData"
                :model="ArgsModel"
                @set-value="({ field, value }) => $set(argsData, field, value)"
            />
            <div class="execute-btns">
                <button
                    v-for="{ playbookName, title, help } in buttons"
                    :key="playbookName"
                    :title="help"
                    type="button"
                    class="btn btn-secondary"
                    @click="executePlaybook(playbookName)"
                >
                    {{ title }}
                </button>
            </div>
        </Card>
    </div>
</template>

<script>
    export default {
        name: 'RunPlaybook',
        components: {
            Card: spa.components.Card,
            ModelFields: spa.components.page.ModelFields,
        },
        props: {
            page: { type: Object, required: true },
        },
        data() {
            return {
                AnsibleModule: this.$app.modelsResolver.get('AnsibleModule'),
                mainData: {},
                argsData: {},
            };
        },
        computed: {
            ArgsModel() {
                return this.$app.modelsResolver.bySchemaObject({
                    type: 'object',
                    properties: { ...this.executeData.fields },
                });
            },
            executeData() {
                const data = this.page.data.execute_view_data._data;
                if (!data || !data.playbooks) {
                    return null;
                }
                return data;
            },
            buttons() {
                return Object.entries(this.executeData.playbooks).map(([playbookName, btn]) => ({
                    ...btn,
                    playbookName,
                    title: btn.title || playbookName,
                }));
            },
        },
        methods: {
            async executePlaybook(name) {
                const actionView = this.$app.views.get('/project/{id}/execute_playbook/');
                try {
                    const response = await this.$app.api.makeRequest({
                        useBulk: true,
                        method: spa.utils.HttpMethods.POST,
                        path: spa.utils.formatPath(actionView.path, { id: this.page.getInstancePk() }),
                        data: {
                            ...this.mainData,
                            playbook: name,
                            extra_vars: JSON.stringify(this.argsData),
                        },
                    });
                    this.page.openPage(
                        this.page._getRedirectUrlFromResponse(response.data, actionView.modelsList[1]),
                    );
                } catch (e) {
                    this.$app.error_handler.defineErrorAndShow(e);
                }
            },
        },
    };
</script>

<style scoped>
    .execute-btns .btn + .btn {
        margin-left: 0.5rem;
    }
</style>
