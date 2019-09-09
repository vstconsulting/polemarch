/**
 * Mixin for 'field_content_read_only' of json gui_field.
 */
const ansible_json_field_content_read_only_mixin = {
    template: "#template_field_content_readonly_json",
    data() {
        return {
            real_elements: {},
            real_elements_values: {},
            realField: {},
        };
    },
    created() {
        if(!this.value) {
            return;
        }

        this.realFields = this.getRealElements();
        this.sortValues();
    },
    methods: {
        /**
         * Returns sorted values in real elements.
         */
        sortValues() {
            let sorted_values = {};
            let sorted_keys = [
                'short_description', 'description', 'module', 'version_added', 'required',
                'requirements', 'extends_documentation_fragment', 'options', 'notes', 'author',
            ];

            for(let i = 0; i < sorted_keys.length; i++) {
                let field = sorted_keys[i];
                if(this.realFields[field] !== undefined) {
                    sorted_values[field] = this.realFields[field];
                }
            }

            for(let field in this.realFields) {
                if($.inArray(field, sorted_keys) == -1) {
                    sorted_values[field] = this.realFields[field];
                }
            }

            this.realFields = sorted_values;
        },
        /**
         * Returns real elements and values.
         */
        getRealElements() {
            let realElements = {};

            let fields_types = {
                short_description: 'text_paragraph',
                description: 'text_paragraph',
                notes: 'text_paragraph',
            };

            let options_field_title = "Options:";
            let options_child_fields_subtitle = "Option: ";

            for(let field in this.value) {
                if(this.value.hasOwnProperty(field)) {
                    let options = {
                        name: field,
                        readOnly: this.field.options.readOnly || true,
                        title: capitalizeString(field.replace(/_/g, " ")),
                        format: 'string',
                    };

                    if (fields_types[field] && options.title != options_field_title) {
                        options.format = fields_types[field];

                        if (this.field.options.title && options.title.search(options_child_fields_subtitle) != -1) {
                            options.hide_title = true;
                        }
                    } else if (typeof this.value[field] == "string" && this.value[field].length > 50) {
                        options.format = 'textarea';
                    } else if (typeof this.value[field] == 'boolean') {
                        options.format = 'boolean';
                    } else if (typeof this.value[field] == 'object') {
                        if (Array.isArray(this.value[field])) {
                            options.format = 'textarea';
                        } else if (this.value[field] === null) {
                            options.format = 'null';
                        } else {
                            options.format = 'ansible_json';
                            if (allPropertiesIsObjects(this.value[field])) { /* globals allPropertiesIsObjects */
                                options.divider = true;
                                options.title += ":";
                            } else {
                                /* jshint maxdepth: false */
                                if (this.field.options.title == options_field_title) {
                                    options.title = options_child_fields_subtitle + field;
                                }
                            }
                        }
                    }

                    if ((
                        typeof this.value[field] == "string" && this.value[field] == "") ||
                        (Array.isArray(this.value[field]) && this.value[field].length == 0) ||
                        (
                            typeof this.value[field] == "object" &&
                            this.value[field] !== null &&
                            Array.isArray(this.value[field]) == false &&
                            Object.keys(this.value[field]).length == 0
                        )) {
                        options.format = 'hidden';
                    }

                    realElements[field] = new guiFields[options.format](options);
                }
            }

            return realElements;
        }
    }
};

/**
 * Mixin for 'one_history_fk' fields.
 */
const one_history_fk_mixin = {
    components: {
        field_content_readonly: {
            mixins: [
                base_field_content_readonly_mixin, field_fk_content_readonly_mixin,
            ],
            // template: "#template_one_history_fk_field_content_readonly_link",
            template: "#template_field_content_readonly_fk",
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
gui_fields_mixins.ansible_json = {
    data: function () {
        return {
            wrapper_classes_list: {
                base: "form-group guiField",
                grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
            },
        };
    },
    components: {
        field_content_readonly: {
            mixins: [
                base_field_content_readonly_mixin, ansible_json_field_content_read_only_mixin
            ],
        },
    },
};

/**
 * Mixin for fk_just_value field.
 */
gui_fields_mixins.fk_just_value = {
    template: "#template_field_fk_just_value",
    components: {
        field_content_readonly: {
            mixins: [
                base_field_content_readonly_mixin, field_fk_content_readonly_mixin,
            ],
            // template: "#template_field_content_readonly_fk_just_value",
            template: "#template_field_content_readonly_fk",
            data() {
                return {
                    class_list: ["revers-color"],
                    styles_dict: {display: 'contents'},
                };
            }
        },
    },
};

/**
 * Mixin for one_history_string field.
 */
gui_fields_mixins.one_history_string = {
    data: function () {
        return {
            wrapper_classes_list: {
                base: "form-group " + addCssClassesToElement(
                    'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                ),
                grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
            },
        };
    },
    components: {
        field_label: {
            mixins: [base_field_label_mixin],
            data() {
                return {
                    styles_dict: {
                        float: 'left',
                        width: '50%',
                    },
                };
            },
        },
        field_content_readonly: {
            mixins: [base_field_content_readonly_mixin],
            template: "#template_field_content_readonly_one_history_string",
            data() {
                return {
                    class_list: ["text-data"],
                    styles_dict: {
                        float: 'left',
                        width: '50%',
                    },
                };
            },
        },
    },
};

/**
 * Mixin for one_history_fk field.
 */
gui_fields_mixins.one_history_fk = {
    mixins: [one_history_fk_mixin],
};

/**
 * Mixin for one_history_initiator field.
 */
gui_fields_mixins.one_history_initiator = {
    mixins: [one_history_fk_mixin],
};

/**
 * Mixin for one_history_choices field.
 */
gui_fields_mixins.one_history_choices = {
    components: {
        field_content_readonly: {
           mixins: [choices_field_content_readonly_mixin], /* globals choices_field_content_readonly_mixin */
            template: "#template_field_content_readonly_one_history_choices",
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
 * Mixin for one_history_boolean field.
 */
gui_fields_mixins.one_history_boolean = {
    components: {
        field_content_readonly: {
            mixins: [base_field_content_edit_mixin, boolean_field_content_mixin], /* globals base_field_content_edit_mixin, boolean_field_content_mixin */
            template: "#template_field_content_read_only_one_history_boolean",
            data() {
                return {
                    class_list: [],
                    styles_dict: {
                        float: 'left',
                        width: '50%',
                    },
                };
            },
            computed: {
                selected: function(){
                    return this.value ? 'boolean-true fa fa-check' : 'boolean-false fa fa-times';
                },
            },
        },
    },
};

/**
 * Mixin for one_history_execute_args field.
 */
gui_fields_mixins.one_history_execute_args = {
    template: "#template_field_one_history_execute_args",
    data: function () {
        return {
            execute_args_toggle: false,
        };
    },
    components: {
        field_label: {
            mixins: [base_field_label_mixin],
            data() {
                return {
                    styles_dict: {
                        paddingRight: '10px',
                    },
                };
            },
        },
    },
};

/**
 * Mixin for one_history_raw_inventory field.
 */
gui_fields_mixins.one_history_raw_inventory = {
    template: "#template_field_one_history_raw_inventory",
};

/**
 * Mixin for history_executor field.
 */
gui_fields_mixins.history_executor = {
    components: {
        field_list_view: {
            mixins: [base_field_list_view_mixin, field_fk_content_readonly_mixin], /* globals base_field_list_view_mixin */
            template: "#template_field_part_list_view_fk",
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
gui_fields_mixins.one_history_executor = {
    components: {
        field_content_readonly: {
            mixins: [
                base_field_content_readonly_mixin, field_fk_content_readonly_mixin,
            ],
            template: "#template_field_content_readonly_fk",
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
    }
};