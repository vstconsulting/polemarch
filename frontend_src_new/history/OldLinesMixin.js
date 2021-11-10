// Old logic is used for now, code style may be bad but it is working
// TODO: Probably need to rewrite it

/** @vue/component */
export default {
    mixins: [spa.autoupdate.ComponentWithAutoUpdate],
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
             * Property, that stores last status of history instance.
             */
            last_status: undefined,
            /**
             * Property, that stores stdout DOM element.
             */
            stdout_el: undefined,
        };
    },

    computed: {
        autoupdateSubscriptionLabels() {
            return null;
        },
        /**
         * Property, that returns url for getting stdout lines.
         * @return {string}
         */
        lines_url() {
            let url = this.$route.path.replace(/^\/|\/$/g, '');

            return '/' + url + '/lines/';
        },
        /**
         * Property, that returns glued (concatenated) lines of history stdout output.
         */
        gluedLines() {
            let obj = {};

            for (let index = 0; index < this.lines.length; index++) {
                let subline = this.lines[index];

                if (!obj[subline.line_gnumber]) {
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

            for (let key in this.gluedLines) {
                if (this.gluedLines.hasOwnProperty(key)) {
                    html.push(spa.colors.ansiToHTML(this.gluedLines[key].text));
                }
            }

            return html.join('');
        },
        /**
         * Property, that return boolean values, that means: need to load additional lines on scroll event or not.
         * @return {boolean}
         */
        needLoadAdditionalData() {
            if (['RUN', 'DELAY'].includes(this.instance._data.status)) {
                return false;
            }

            let lines = [...this.lines].sort((a, b) => {
                return b.line_gnumber - a.line_gnumber;
            });

            if (lines.last.line_gnumber == 1 || lines.last.line_gnumber == 0) {
                return false;
            }

            return true;
        },
    },

    watch: {
        cleared: function (value) {
            if (value) {
                this.sendLinesApiRequest({ limit: this.lines_limit }).then((response) => {
                    this.lines = [];
                    this.saveNewLines(response.data.results);
                });
            }
        },
    },

    created() {
        this.getLines().then((response) => {
            /* jshint unused: false */
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
        autoAutoUpdateActionName() {
            return 'updateData';
        },
        /**
         * Method - on scroll event handler.
         */
        updateData() {
            let instance_data = this.instance._data;

            if (['RUN', 'DELAY'].includes(instance_data.status)) {
                this.last_status = instance_data.status;

                return this.loadLinesFromBeginning().then((response) => {
                    /* jshint unused: false */
                    setTimeout(() => {
                        $(this.stdout_el).scrollTop($(this.stdout_el).prop('scrollHeight'));
                    }, 300);
                });
            } else {
                if (['RUN', 'DELAY'].includes(this.last_status)) {
                    this.last_status = instance_data.status;

                    this.sendLinesApiRequest({ limit: this.lines_limit }).then((response) => {
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
            if (this.needLoadAdditionalData) {
                let height = $(this.stdout_el).prop('scrollHeight');

                return this.loadLinesFromEnd().then((response) => {
                    /* jshint unused: false */
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
            if ($(this.stdout_el).scrollTop() < 100) {
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
            let instance_data = this.instance._data;

            if (['RUN', 'DELAY'].includes(instance_data.status)) {
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

            if (this.lines.last) {
                query.after = this.lines.last.line_gnumber;
            }

            return this.sendLinesApiRequest(query).then((response) => {
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

            if (this.lines.last) {
                query.before = this.lines.last.line_gnumber;
            }

            return this.sendLinesApiRequest(query).then((response) => {
                this.saveNewLines(response.data.results);
                return response;
            });
        },

        /**
         * Method, that sends request to API for getting stdout lines.
         */
        async sendLinesApiRequest(query = {}) {
            this.loading = true;
            const response = await this.$app.api.makeRequest({
                method: spa.utils.HttpMethods.GET,
                path: this.lines_url,
                query,
                useBulk: true,
            });
            this.loading = false;
            return response;
        },
        /**
         * Method, that saves only lines, that were not saved before.
         * @param {array} new_lines Array with potential new lines.
         */
        saveNewLines(new_lines = []) {
            for (let index = 0; index < new_lines.length; index++) {
                let new_line = new_lines[index];

                let filtered = this.lines.filter((line) => {
                    if (spa.utils.deepEqual(line, new_line)) {
                        return line;
                    }
                });

                if (filtered.length == 0) {
                    this.lines.push(new_line);
                }
            }
        },
    },
};
