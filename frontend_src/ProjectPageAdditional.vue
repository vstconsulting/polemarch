<template>
    <div class="card card-info quick-playbook-run-form">
        <div class="card-header with-border card-header-custom">
            {{ $t('quick playbook execution form') | capitalize }}
            <button
                type="button"
                class="btn btn-card-tool btn-sm btn-light btn-icon btn-right"
                @click="toggleCardCollapsed"
                v-if="card_collapsed_button"
            >
                <i class="fa" :class="card_collapsed ? 'fa-plus' : 'fa-minus'"></i>
            </button>
        </div>
        <transition name="fade">
            <div class="card-body card-body-custom card-body-page" v-show="!card_collapsed">
                <field_form
                    :field="base_fields"
                    :wrapper_opt="{ use_prop_data: true }"
                    :prop_data="{ base_fields: base_fields_value }"
                    @setValueInStore="formOnChangeHandler('base_fields_value', $event)"
                ></field_form>

                <field_form
                    :field="extra_vars"
                    :wrapper_opt="{ use_prop_data: true }"
                    :prop_data="{ extra_vars: extra_vars_value }"
                    @setValueInStore="formOnChangeHandler('extra_vars_value', $event)"
                ></field_form>

                <field_form
                    :field="buttons"
                    :wrapper_opt="{ use_prop_data: true }"
                    :prop_data="{ buttons: {} }"
                ></field_form>
            </div>
        </transition>
    </div>
</template>

<script>
    /**
     * Vue component of 'Run playbook form'.
     */
    export default {
        name: 'ProjectPageAdditional',
        mixins: [spa.components.mixins.BasePageTypeMixin, spa.router.mixins.CollapsibleCardMixin],
        data() {
            return {
                /**
                 * Property, that stores instance of guiField.form -
                 * form with base fields of 'Run playbook form'.
                 */
                base_fields: undefined,
                /**
                 * Property, that stores value of base_fields form.
                 */
                base_fields_value: {},

                /**
                 * Property, that stores instance of guiField.form -
                 * form with extra fields of 'Run playbook form'.
                 */
                extra_vars: undefined,
                /**
                 * Property, that stores value of extra_vars form.
                 */
                extra_vars_value: {},
                /**
                 * Property, that stores instance of guiField.form -
                 * form with playbook buttons of 'Run playbook form'.
                 */
                buttons: undefined,
                /**
                 * Boolean property, that is responsible for showing/hiding collapse-button.
                 */
                card_collapsed_button: true,
            };
        },
        created() {
            let instance = this.data.instance;

            // initialization of base_fields, extra_vars and buttons properties.
            if (instance && instance.data && instance.data.execute_view_data) {
                this.base_fields = new spa.fields.guiFields.form(this.getBaseFieldsFormOptions());

                this.extra_vars = new spa.fields.guiFields.form(
                    this.getExtraVarsFormOptions(instance.data.execute_view_data),
                );

                this.buttons = new spa.fields.guiFields.form(
                    this.getButtonsForm(instance.data.execute_view_data),
                );
            }
        },
        methods: {
            /**
             * Method, that returns options for base_fields form.
             */
            getBaseFieldsFormOptions() {
                return {
                    name: 'base_fields',
                    title: 'Execute parameters',
                    form: {
                        inventory: {
                            name: 'inventory',
                            title: 'inventory',
                            description: 'inventory, on which playbook will be executed',
                            required: true,
                            format: 'inventory_autocomplete',
                            additionalProperties: {
                                view_field: 'name',
                                value_field: 'id',
                                list_paths: ['/project/{' + spa.utils.path_pk_key + '}/inventory/'],
                            },
                        },
                        user: {
                            name: 'user',
                            title: 'User',
                            description: 'connect as this user (default=None)',
                            format: 'string',
                        },
                        key_file: {
                            name: 'key_file',
                            title: 'Key file',
                            description: 'use this file to authenticate the connection',
                            format: 'secretfile',
                        },
                    },
                };
            },
            /**
             * Method, that returns options for extra_vars form.
             * @param {object} data Schema of 'Run playbook form'.
             * @returns {object}.
             */
            getExtraVarsFormOptions(data) {
                if (!spa.utils.isEmptyObject(data.fields)) {
                    return {
                        name: 'extra_vars',
                        title: 'Additional execute parameters',
                        format: 'form',
                        form: data.fields,
                    };
                }

                return { form: {} };
            },
            /**
             * Method, that returns options for buttons form.
             * @param {object} data Schema of 'Run playbook form'.
             * @returns {object}.
             */
            getButtonsForm(data) {
                if (spa.utils.isEmptyObject(data.playbooks)) {
                    return { form: {} };
                }

                let buttons = {};

                for (let key in data.playbooks) {
                    if (data.playbooks.hasOwnProperty(key)) {
                        let val = data.playbooks[key];

                        buttons[key] = {
                            name: key,
                            title: val.title,
                            description: val.help || val.description,
                            format: 'button',
                            onclick: () => {
                                this.executePlaybook(key);
                            },
                        };
                    }
                }

                return { name: 'buttons', title: ' ', form: buttons };
            },
            /**
             * Method, that returns validated data of 'Run playbook form'.
             * @return {object} Validated data or error.
             */
            getPolemarchYamlValidData() {
                try {
                    let val_base_fields = this.base_fields.toInner({ base_fields: this.base_fields_value });

                    let valid_data = this.base_fields.validateValue({ base_fields: val_base_fields });

                    let val_extra_vars = this.extra_vars.toInner({ extra_vars: this.extra_vars_value });

                    let extra_vars = this.extra_vars.validateValue({ extra_vars: val_extra_vars });

                    if (!spa.utils.isEmptyObject(extra_vars)) {
                        valid_data.extra_vars = extra_vars;
                    }

                    return valid_data;
                } catch (e) {
                    app.error_handler.defineErrorAndShow(e);
                }
            },
            /**
             * Method, that executes playbook.
             * @param {string} playbook.
             */
            executePlaybook(playbook) {
                let data = this.getPolemarchYamlValidData();

                if (!data) {
                    return;
                }

                data.playbook = playbook;

                if (data.extra_vars) {
                    data.extra_vars = JSON.stringify(data.extra_vars);
                }

                let qs = this.view.objects.clone();

                qs.url = (qs.url + 'execute_playbook/').format(this.$route.params);
                qs.formQueryAndSend('post', data)
                    .then((res) => {
                        spa.popUp.guiPopUp.success('Playbook was successfully executed.');

                        if (res && res.data && res.data.history_id) {
                            let redirect_path = '/project/{' + path_pk_key + '}/history/{history_id}/';
                            let redirect_url;

                            try {
                                redirect_url = redirect_path.format(
                                    $.extend(true, {}, this.$route.params, {
                                        history_id: res.data.history_id,
                                    }),
                                );

                                if (redirect_url) {
                                    this.$router.push({ path: redirect_url.replace(/\/$/g, '') });
                                }
                            } catch (e) {}
                        }
                    })
                    .catch((error) => {
                        debugger;
                    });
            },
            /**
             * Method - handler for 'base_fields' and 'extra_vars' forms onChange event.
             * @param {string} prop 'base_fields' or 'extra_vars'.
             * @param {object} value New form value.
             */
            formOnChangeHandler(prop, value) {
                this[prop] = { ...this[prop], ...value };
            },
        },
    };
</script>

<style scoped></style>
