import AnsibleJSONFieldContentReadonly from './AnsibleJSONFieldContentReadonly.vue';
import OneHistoryStringFieldContentReadonly from './OneHistoryStringFieldContentReadonly.vue';
import OneHistoryChoicesFieldContentReadonly from './OneHistoryChoicesFieldContentReadonly.vue';
import OneHistoryBooleanFieldContentReadonly from './OneHistoryBooleanFieldContentReadonly.vue';

/**
 * Mixin for 'one_history_fk' fields.
 */
export const OneHistoryFieldMixin = {
    components: {
        field_content_readonly: {
            mixins: [spa.fields.fk.fk.FKFieldContentReadonlyComponent],
            data() {
                return {
                    class_list: [],
                    styles_dict: {},
                };
            },
        },
    },
};

/**
 * Mixin for ansible json field.
 */
export const AnsibleJSONFieldMixin = {
    data: function () {
        return {
            wrapper_classes_list: {
                base: 'form-group guiField',
                grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
            },
        };
    },
    components: {
        field_content_readonly: {
            mixins: [spa.fields.base.BaseFieldContentReadonlyMixin, AnsibleJSONFieldContentReadonly],
        },
    },
};

/**
 * Mixin for one_history_string field.
 */
export const OneHistoryStringFieldMixin = {
    data: function () {
        return {
            wrapper_classes_list: {
                base:
                    'form-group ' +
                    spa.utils.addCssClassesToElement(
                        'guiField',
                        this.field.options.name,
                        this.field.options.format || this.field.options.type,
                    ),
                grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
            },
        };
    },
    components: {
        field_label: {
            mixins: [spa.fields.base.BaseFieldLabel],
            data() {
                return {
                    styles_dict: {
                        float: 'left',
                        width: '50%',
                    },
                };
            },
        },
        field_content_readonly: OneHistoryStringFieldContentReadonly,
    },
};

/**
 * Mixin for one_history_choices field.
 */
export const OneHistoryChoicesFieldMixin = {
    components: {
        field_content_readonly: OneHistoryChoicesFieldContentReadonly,
    },
};

/**
 * Mixin for one_history_boolean field.
 */
export const OneHistoryBooleanFieldMixin = {
    components: {
        field_content_readonly: OneHistoryBooleanFieldContentReadonly,
    },
};

/**
 * Mixin for history_executor field.
 */
export const HistoryExecutor = {
    components: {
        field_list_view: {
            mixins: [spa.fields.base.BaseFieldListView, spa.fields.fk.fk.FKFieldListView],
            computed: {
                text() {
                    return this.field.toRepresent(this.data);
                },
            },
        },
    },
};

/**
 * Mixin for one_history_executor field.
 */
export const OneHistoryExecutor = {
    components: {
        field_content_readonly: {
            mixins: [
                spa.fields.base.BaseFieldContentReadonlyMixin,
                spa.fields.fk.fk.FKFieldContentReadonly,
                spa.fields.fk.fk.FKFieldContentReadonlyComponent,
            ],
            data() {
                return {
                    class_list: [],
                    styles_dict: {},
                };
            },
            computed: {
                text() {
                    return this.field.toRepresent(this.data);
                },
            },
        },
    },
};
