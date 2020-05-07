<template>
    <div class="row" :aria-labelledby="label_id" :aria-label="aria_label">
        <component
            v-for="(item, idx) in realFields"
            :key="idx"
            :is="'field_' + item.options.format"
            :field="item"
            :prop_data="value"
            :wrapper_opt="{ use_prop_data: true }"
        ></component>
    </div>
</template>

<script>
    /**
     * Mixin for 'field_content_read_only' of json gui_field.
     */
    export default {
        data() {
            return {
                real_elements: {},
                real_elements_values: {},
                realField: {},
            };
        },
        created() {
            if (!this.value) {
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
                    'short_description',
                    'description',
                    'module',
                    'version_added',
                    'required',
                    'requirements',
                    'extends_documentation_fragment',
                    'options',
                    'notes',
                    'author',
                ];

                for (let i = 0; i < sorted_keys.length; i++) {
                    let field = sorted_keys[i];
                    if (this.realFields[field] !== undefined) {
                        sorted_values[field] = this.realFields[field];
                    }
                }

                for (let field in this.realFields) {
                    if ($.inArray(field, sorted_keys) == -1) {
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

                let options_field_title = 'Options:';
                let options_child_fields_subtitle = 'Option: ';

                for (let field in this.value) {
                    if (this.value.hasOwnProperty(field)) {
                        let options = {
                            name: field,
                            readOnly: this.field.options.readOnly || true,
                            title: capitalizeString(field.replace(/_/g, ' ')),
                            format: 'string',
                        };

                        if (fields_types[field] && options.title != options_field_title) {
                            options.format = fields_types[field];

                            if (
                                this.field.options.title &&
                                options.title.search(options_child_fields_subtitle) != -1
                            ) {
                                options.hide_title = true;
                            }
                        } else if (typeof this.value[field] == 'string' && this.value[field].length > 50) {
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
                                if (allPropertiesIsObjects(this.value[field])) {
                                    /* globals allPropertiesIsObjects */
                                    options.divider = true;
                                    options.title += ':';
                                } else {
                                    /* jshint maxdepth: false */
                                    if (this.field.options.title == options_field_title) {
                                        options.title = options_child_fields_subtitle + field;
                                    }
                                }
                            }
                        }

                        if (
                            (typeof this.value[field] == 'string' && this.value[field] == '') ||
                            (Array.isArray(this.value[field]) && this.value[field].length == 0) ||
                            (typeof this.value[field] == 'object' &&
                                this.value[field] !== null &&
                                Array.isArray(this.value[field]) == false &&
                                Object.keys(this.value[field]).length == 0)
                        ) {
                            options.format = 'hidden';
                        }

                        realElements[field] = new guiFields[options.format](options);
                    }
                }

                return realElements;
            },
        },
    };
</script>

<style scoped></style>
