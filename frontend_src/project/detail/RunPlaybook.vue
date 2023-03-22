<template>
    <div v-if="executeData">
        <ModelFields
            :editable="true"
            :data="mainData"
            :model="MainModel"
            :fields-groups="[{ title: '', fields: ['inventory', 'user', 'private_key'] }]"
            flat-if-possible
            flat-fields-classes="col-12"
            @set-value="({ field, value }) => $set(mainData, field, value)"
        />
        <ModelFields
            :editable="true"
            :data="argsData"
            :model="ArgsModel"
            flat-if-possible
            flat-fields-classes="col-12"
            @set-value="({ field, value }) => $set(argsData, field, value)"
        />
        <div class="execute-btns">
            <button
                v-for="{ playbookName, title, help } in buttons"
                :key="playbookName"
                :title="help"
                type="button"
                class="btn btn-secondary"
                @click="executeAnsiblePlaybook(playbookName)"
            >
                {{ title }}
            </button>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'RunPlaybook',
        components: {
            ModelFields: spa.components.page.ModelFields,
        },
        mixins: [spa.fields.base.BaseFieldMixin],
        data() {
            return {
                AnsiblePlaybook: this.$app.modelsResolver.get('ExecuteAnsiblePlaybook'),
                mainData: {},
                argsData: {},
            };
        },
        computed: {
            MainModel() {
                return this.$app.modelsResolver.bySchemaObject({
                    type: 'object',
                    properties: {
                        inventory: this.AnsiblePlaybook.fields.get('inventory'),
                        user: this.AnsiblePlaybook.fields.get('user'),
                        private_key: this.AnsiblePlaybook.fields.get('private_key'),
                    },
                });
            },
            ArgsModel() {
                const properties = {};
                for (const [name, field] of Object.entries(this.executeData.fields)) {
                    properties[name] = {
                        ...field,
                        description: field.help,
                    };
                }

                return this.$app.modelsResolver.bySchemaObject({
                    type: 'object',
                    properties,
                });
            },
            executeData() {
                const data = this.value;
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
            async executeAnsiblePlaybook(name) {
                const actionView = this.$app.views.get('/project/{id}/execute_ansible_playbook/');
                try {
                    const mainDataInstance = new this.AnsiblePlaybook();
                    mainDataInstance._validateAndSetData({ playbook: name, ...this.mainData });
                    const response = await this.$app.api.makeRequest({
                        useBulk: true,
                        method: spa.utils.HttpMethods.POST,
                        path: spa.utils.formatPath(actionView.path, {
                            id: this.$app.store.page.getInstancePk(),
                        }),
                        data: {
                            ...mainDataInstance._getInnerData(),
                            playbook: name,
                            extra_vars: JSON.stringify(this.argsData),
                        },
                    });
                    spa.utils.openPage(
                        spa.utils.getRedirectUrlFromResponse(response.data, actionView.modelsList[1]),
                    );
                } catch (e) {
                    this.$app.error_handler.defineErrorAndShow(e);
                }
            },
        },
    };
</script>

<style scoped>
    .execute-btns .btn {
        margin-right: 0.5rem;
        margin-bottom: 0.5rem;
    }
</style>
