/**
 * Function, that adds signal for some history model's fields.
 * @param {string} model
 */
function historyModelsFieldsHandler(model) {
    let str = "models[{0}].fields.beforeInit".format([model]);
    tabSignal.connect(str, (fields) => {
        fields.start_time.format = 'one_history_date_time';
        fields.stop_time.format = 'one_history_date_time';

        if(fields.inventory) {
            fields.inventory.format = 'fk';
            fields.inventory.additionalProperties = {
                model: {$ref: "#/definitions/Inventory"},
                value_field: "id",
                view_field: "name",
            };
        }

        if(fields.executor) {
            fields.executor.format = 'history_executor';
            fields.executor.additionalProperties = {
                model: {$ref: "#/definitions/User"},
                // list_paths: ["/user/"],
                value_field: "id",
                view_field: "username",
            };
        }

        if(fields.project) {
            fields.project.format = 'fk';
            fields.project.additionalProperties = {
                model: {$ref: "#/definitions/Project"},
                value_field: "id",
                view_field: "name",
            };
        }

        if(fields.options) {
            fields.options.hidden = true;
        }

        if(fields.initiator) {
            fields.initiator.format = 'history_initiator';
            fields.initiator.additionalProperties = {
                list_paths: Object.values(history_initiator_types),
                view_field: 'name',
                value_field: 'id',
            };
        }

        if(fields.initiator_type) {
            fields.initiator_type.hidden = true;
        }

        if(fields.revision) {
            fields.revision.format = 'one_history_revision';
        }
    });
}

/**
 * Function, that adds signal for some OneHistory model's fields.
 * @param {string} model
 */
function OneHistoryFieldsHandler(model) {
    tabSignal.connect("models[" + model + "].fields.beforeInit", (fields) => {
        for(let field in fields) {
            fields[field].format = 'one_history_string';

            if(['kind', 'raw_args', 'raw_stdout', 'initiator_type'].includes(field)) {
                fields[field].format = 'hidden';
            } else if(['start_time', 'stop_time'].includes(field)) {
                fields[field].format = 'one_history_date_time';
            }
        }

        fields.executor.format = 'one_history_executor';
        fields.initiator.format = 'one_history_initiator';
        fields.project.format = 'one_history_fk';
        fields.inventory.format = 'one_history_fk';
        fields.inventory.hidden = true;
        fields.execute_args.format = 'one_history_execute_args';
        fields.execution_time.format = 'one_history_uptime';
        fields.revision.format = 'one_history_revision';
        fields.status.format = 'one_history_choices';

        fields.raw_inventory.format = 'one_history_raw_inventory';
        fields.raw_inventory.hidden = true;

        fields.mode.format = 'dynamic';
        fields.mode.additionalProperties = {
            callback: OneHistory_kind_mode_callback,
            field: ['kind'],
        };
    });
}

/**
 * Function, that adds signal for some history view's filters.
 * @param {string} path
 */
function historyPathsFiltersHandler(path) {
    /**
     * Changes 'status' filter type to 'choices'.
     */
    tabSignal.connect("views[" + path + "].filters.beforeInit", filters => {
        for(let index in filters) {
            let filter = filters[index];

            if(filter.name == 'status') {
                filter.type = 'choices';
                filter.enum = app.models['History'].fields.status.options.enum;
            }
        }
    });
}

/**
 * Function, that adds signal for some history view modification.
 * @param {string} path
 */
function historyPathsViewsHandler(path) {
    tabSignal.connect("views[" + path + "].afterInit", (obj) => {
        if(obj.view.schema.type == 'page') {
            obj.view.mixins = obj.view.mixins.concat(history_pk_mixin);
            obj.view.template = '#template_view_history_one';
        }
    });

    tabSignal.connect('views[' + path + '].created', obj => {
        if(obj.view.schema.type == 'list' && obj.view.schema.operations && obj.view.schema.operations.add) {
            delete obj.view.schema.operations.add;
        }
    });
}

/**
 * Function - onchange callback of dynamic field - OneHistory.fields.mode.
 */
function OneHistory_kind_mode_callback(parent_values={}) {
    let obj = {
        format: 'one_history_string',
        save_value: true,
    };

    if(parent_values['kind']) {
        obj.title = parent_values['kind'].toLowerCase();
    }

    return obj;
}

/**
 * Function, that adds signals for history models and history views.
 */
function addHistorySignals() {
    history_models.forEach(historyModelsFieldsHandler);

    history_paths.forEach(historyPathsViewsHandler);

    history_paths.forEach(historyPathsFiltersHandler);

    OneHistoryFieldsHandler('OneHistory');
}

/**
 * Variable, that stores array with History Models names,
 * fields of those should be changed in the tabSignal.
 */
var history_models = ['History', 'OneHistory', 'ProjectHistory'];

/**
 * Variable, that stores pairs (key, value), where:
 * - key - value of initiator_type field;
 * - value - path from which should be loaded prefetch data.
 */
var history_initiator_types = {
    project: '/project/',
    template: '/project/{' + path_pk_key + '}/template/',
    scheduler: '/project/{' + path_pk_key + '}/periodic_task/',
};

/**
 * Variable, that stores array with History paths,
 * options of those should be changed in the tabSignal.
 */
var history_paths = [
    '/history/',
    '/history/{' + path_pk_key + '}/',
    '/project/{' + path_pk_key + '}/history/',
    '/project/{' + path_pk_key + '}/history/{history_id}/',
];

/**
 * Mixin for /history/{pk}/ view.
 */
var history_pk_mixin = {
    data: function () {
        return {
            inventory_toggle: false,
            output_toggle: true,
            information_toggle: true,

            was_cleared: undefined,
        }
    },
    /**
     * Redefinition of 'beforeRouteUpdate' hook of view_with_autoupdate_mixin.
     */
    beforeRouteUpdate(to, from, next) {
        this.stopChildrenAutoUpdate();
        this.stopAutoUpdate();
        next();
    },
    /**
     * Redefinition of 'beforeRouteUpdate' hook of view_with_autoupdate_mixin.
     */
    beforeRouteLeave(to, from, next) {
        this.stopChildrenAutoUpdate();
        this.stopAutoUpdate();
        this.$destroy();
        next();
    },
    computed: {
        /**
         * Property, that returns inventory field instance from inventory section.
         */
        inventory_field() {
            let options = $.extend(true, {}, this.view.objects.model.fields.inventory.options);
            options.format = 'fk_just_value';
            options.hidden = false;
            let field = new guiFields.fk_just_value(options);
            field = guiFields.fk_just_value.prepareField(field, this.$route.name);
            return field;
        },
        /**
         * Property, that returns prop data for inventory field from inventory section
         */
        inventory_field_prop_data() {
            return this.data.instance.data;
        },
        /**
         * Property, that returns wrapper_opt object for inventory field from inventory section
         */
        inventory_field_wrapper_opt() {
            return {
                use_prop_data: true,
                readOnly: true,
            };
        },
        /**
         * Property, that returns raw inventory field instance from inventory section.
         */
        raw_inventory_field() {
            let options = $.extend(true, {}, this.view.objects.model.fields.raw_inventory.options);
            options.format = 'one_history_raw_inventory';
            options.hidden = false;
            let field = new guiFields.one_history_raw_inventory(options);
            return field;
        },
        /**
         * Property, that is responsible for showing and hiding of clear button.
         */
        clear_button_show() {
            if(this.data.instance.data && !["RUN", "DELAY"].includes(this.data.instance.data.status)) {
                return true;
            }

            return false;
        },
        /**
         * Property, that returns object with options for clear button.
         */
        clear_button_options() {
            return {
                name: 'clear',
            }
        },
        /**
         * Property, that returns object with look options for clear button.
         */
        clear_button_look() {
            return {
                icon_classes: ['fa', 'fa-trash', 'fa-lg'],
                title_classes: ['clear-btn-title'],
                classes: ['btn', 'btn-card-tool', 'btn-sm', 'btn-light', 'btn-icon', 'clear-btn' , 'hidden-button'],
            };
        }
    },
    methods: {
        /**
         * Stops autoupdate of history_stdout component.
         */
        stopChildrenAutoUpdate() {
            this.$children.forEach(child => {
                if(child.stopAutoUpdate && typeof child.stopAutoUpdate == 'function') {
                    child.stopAutoUpdate();
                }
            });
        },
        /**
         * Method, that sends API request for cleaning of history stdout.
         */
        clearInstance() {
            let qs = this.getQuerySet(this.view, this.qs_url).clone({url: this.qs_url + '/clear'});

            qs.formQueryAndSend('delete').then(response => {
                guiPopUp.success(pop_up_msg.instance.success.execute.format(
                    ['clear', this.view.schema.name]
                ));

                this.was_cleared = true;
            }).catch(error => {
                let str = app.error_handler.errorToString(error);

                let srt_to_show = pop_up_msg.instance.error.execute.format(
                    ['clear', this.view.schema.name, str],
                );

                app.error_handler.showError(srt_to_show, str);
            });
        },
    },
    components: {
        /**
         * Component for clear history stdout button.
         */
        clear_button: {
            mixins: [base_button_mixin],
        },
        /**
         * Component, that is responsible for loading and showing history stdout output.
         */
        history_stdout: {
            template: "#template_history_stdout",
            mixins: [view_with_autoupdate_mixin],
            props: ['instance', 'url', 'cleared'],
            data() {
                return {
                    /**
                     * Array, that stores API response.data.results - array with lines objects.
                     */
                    lines: [],
                    /**
                     * Number - limit filter value for lines query.
                     */
                    lines_limit: 500,
                    /**
                     * Property, that means: is component loading data right now or not.
                     */
                    loading: false,
                    /**
                     * Property, that stores QuerySet for lines loading.
                     */
                    lines_qs: undefined,
                    /**
                     * Property, that stores last status of history instance.
                     */
                    last_status: undefined,
                    /**
                     * Property, that stores stdout DOM element.
                     */
                    stdout_el: undefined,
                };
            },

            watch: {
                'cleared': function(value) {
                    if(value) {
                        this.sendLinesApiRequest({limit:this.lines_limit}).then(response => {
                            this.lines = [];
                            this.saveNewLines(response.data.results);
                        });
                    }
                },
            },

            computed: {
                /**
                 * Property, that returns url for getting stdout lines with api prefix.
                 * @return {string}
                 */
                raw_stdout_link() {
                    let url = this.url.replace(/^\/|\/$/g, "");

                    return '/api/' + api_version + '/' + url + '/raw';
                },
                /**
                 * Property, that returns url for getting stdout lines.
                 * @return {string}
                 */
                lines_url() {
                    let url = this.url.replace(/^\/|\/$/g, "");

                    return "/" + url + "/lines/";
                },
                /**
                 * Property, that returns glued (concatenated) lines of history stdout output.
                 */
                gluedLines() {
                    let obj = {};

                    for(let index in this.lines) {
                        let subline = this.lines[index];

                        if(!obj[subline.line_gnumber]) {
                            obj[subline.line_gnumber] = {
                                id: subline.line_gnumber,
                                text: subline.line,
                            };
                        } else {
                            obj[subline.line_gnumber].text += subline.line;
                        }
                    }

                    return obj;
                },
                /**
                 * Property, that return lines ready to represent - gluedLines with appropriate ansi_up CSS classes.
                 */
                linesHTML() {
                    let html = [];

                    for(let key in this.gluedLines) {
                        html.push(this.ansiUp(this.gluedLines[key].text));
                    }

                    return html.join("");
                },
                /**
                 * Property, that return boolean values, that means: need to load additional lines on scroll event or not.
                 * @return {boolean}
                 */
                needLoadAdditionalData() {
                    if(["RUN", "DELAY"].includes(this.instance.data.status)) {
                        return false;
                    }

                    let lines = [ ...this.lines].sort((a, b) => {
                        return b.line_gnumber - a.line_gnumber;
                    });

                    if(lines.last.line_gnumber == 1 || lines.last.line_gnumber == 0) {
                        return false;
                    }

                    return true;
                },
            },

            created() {
                this.lines_qs = new guiQuerySets.QuerySet(app.models.OneHistory, this.lines_url);
                this.getLines().then(responce => {
                    setTimeout(() => {
                        $(this.stdout_el).scrollTop($(this.stdout_el).prop('scrollHeight'));
                    }, 300);
                    this.startAutoUpdate();
                });
            },

            mounted() {
                this.stdout_el = $(this.$el).find('.history-stdout')[0];
            },

            methods: {
                /**
                 * Method - on scroll event handler.
                 */
                updateData() {
                    let instance_data = this.instance.data;

                    if(["RUN", "DELAY"].includes(instance_data.status)) {
                        this.last_status = instance_data.status;

                        return this.loadLinesFromBeginning().then(response => {
                            setTimeout(() => {
                                $(this.stdout_el).scrollTop($(this.stdout_el).prop('scrollHeight'));
                            }, 300);
                        });
                    } else {
                        if(["RUN", "DELAY"].includes(this.last_status)) {
                            this.last_status = instance_data.status;

                            this.sendLinesApiRequest({limit:this.lines_limit}).then(response => {
                                this.saveNewLines(response.data.results);

                                setTimeout(() => {
                                    $(this.stdout_el).scrollTop($(this.stdout_el).prop('scrollHeight'));
                                }, 300);
                            });
                        }

                        return Promise.resolve();
                    }
                },
                /**
                 * Method, that updates data on scroll event.
                 */
                updateDataOnScroll() {
                    if(this.needLoadAdditionalData) {
                        let height = $(this.stdout_el).prop('scrollHeight');

                        return this.loadLinesFromEnd().then(response => {
                            setTimeout(() => {
                                $(this.stdout_el).scrollTop($(this.stdout_el).prop('scrollHeight') - height);
                            }, 300);
                        });
                    }
                },
                /**
                 * Method - on scroll event handler.
                 */
                scrollHandler() {
                    if($(this.stdout_el).scrollTop() < 100) {
                        this.updateDataOnScroll();
                    }
                },
                /**
                 * Method, that gets lines and set them to this.lines async.
                 */
                getLines() {
                    return this.loadLines();
                },

                /**
                 * Method, that loads history stdout output lines from API.
                 */
                loadLines() {
                    let instance_data = this.instance.data;

                    if(["RUN", "DELAY"].includes(instance_data.status)) {
                        return this.loadLinesFromBeginning();
                    } else {
                        return this.loadLinesFromEnd();
                    }
                },

                /**
                 * Method, that loads history stdout output lines from API: from first line to last.
                 */
                loadLinesFromBeginning() {
                    let query = {
                        ordering: 'line_gnumber',
                        limit: this.lines_limit,
                    };

                    if(this.lines.last) {
                        query.after = this.lines.last.line_gnumber;
                    }

                    return this.sendLinesApiRequest(query).then(response => {
                        this.saveNewLines(response.data.results);
                        return response;
                    });
                },

                /**
                 * Method, that loads history stdout output lines from API: from last line to first.
                 */
                loadLinesFromEnd() {
                    let query = {
                        ordering: '-line_gnumber',
                        limit: this.lines_limit,
                    };

                    if(this.lines.last) {
                        query.before = this.lines.last.line_gnumber;
                    }

                    return this.sendLinesApiRequest(query).then(response => {
                        this.saveNewLines(response.data.results);
                        return response;
                    });
                },

                /**
                 * Method, that sends request to API for getting stdout lines.
                 */
                sendLinesApiRequest(query={}) {
                    let qs = this.lines_qs.clone({query:query});

                    this.loading = true;
                    return qs.formQueryAndSend('get').then(response => {
                        this.loading = false;
                        return response;
                    }).catch(error => {
                        throw error;
                    });
                },

                /**
                 * Method, that saves only lines, that were not saved before.
                 * @param {array} new_lines Array with potential new lines.
                 */
                saveNewLines(new_lines=[]) {
                    for(let index in new_lines) {
                        let new_line = new_lines[index];

                        let filtered = this.lines.filter(line => {
                            if(deepEqual(line, new_line)) {
                                return line;
                            }
                        });

                        if(filtered.length == 0) {
                            this.lines.push(new_line);
                        }
                    }
                },
                /**
                 * Method, that returns html (line content with ansi_up classes).
                 * This method uses syntax highlighter form @link.
                 * @link https://habrahabr.ru/post/43030/
                 * @param {string} line_content Content of line.
                 */
                ansiUp(line_content) {
                    let comments = [];	// Array to collect all comments
                    let strings = [];	// Array to collect all line
                    let res = [];	// Array to collect all RegEx
                    let all = {'C': comments, 'S': strings, 'R': res};
                    let safe = {'<': '<', '>': '>', '&': '&'};

                    let ansi_up = new AnsiUp;
                    ansi_up.use_classes = true;
                    let html = ansi_up.ansi_to_html(line_content);

                    return html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Change tab to non-breakable space
                },
            },
        },
    },
};

// adds signal for history models and views.
addHistorySignals();

tabSignal.connect('allViews.inited', obj => {
    let views = obj.views;

    history_paths.forEach(path => {
        views[path].getViewSublinkButtons = function(type, buttons, instance) {
            let data = instance.data;
            let btns = $.extend(true, {}, buttons);

            if(!data) {
                return btns;
            }

            if(type == 'actions' || type == 'child_links') {
                if(!['RUN', 'DELAY'].includes(data['status'])) {
                    btns['cancel'].hidden = true;
                }

                if(!(data['status'] == 'OK' && data['kind'] == 'MODULE' && data['mode'] == 'setup')) {
                    btns['facts'].hidden = true;
                }

                btns['clear'].hidden = true;
            }

            return btns;
        }
    });
});