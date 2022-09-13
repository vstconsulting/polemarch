/** @vue/component */
export const ExecutionTimeFieldMixin = {
    data() {
        return {
            intervalId: null,
            generatedTime: null,
        };
    },
    computed: {
        shouldGenerateTime() {
            return this.$app.centrifugoClient && ['RUN', 'DELAY'].includes(this.data.status);
        },
        value() {
            if (this.shouldGenerateTime) {
                return this.generatedTime;
            }
            return this.data[this.field.name];
        },
    },
    watch: {
        shouldGenerateTime: {
            immediate: true,
            handler(value) {
                if (value && !this.intervalId) {
                    this.intervalId = setInterval(() => this.updateGeneratedTime(), 1000);
                } else {
                    clearInterval(this.intervalId);
                }
            },
        },
    },
    methods: {
        updateGeneratedTime() {
            this.generatedTime = this.$u.getTimeInUptimeFormat(
                window.moment.duration(window.moment().diff(this.data.start_time)).asSeconds(),
            );
        },
    },
};

export class ExecutionTimeField extends spa.fields.datetime.UptimeField {
    static format = 'execution-time';

    static get mixins() {
        return super.mixins.concat(ExecutionTimeFieldMixin);
    }
}

spa.signals.once('APP_CREATED', (app) => {
    app.fieldsResolver.registerField('integer', ExecutionTimeField.format, ExecutionTimeField);
});
