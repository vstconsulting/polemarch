<template>
    <div class="col-md-6">
        <Card :title="$t('execution output') | capitalize">
            <template #tools>
                <button type="button" class="btn btn-tool" title="Clear" @click="clear">
                    <i class="fa fa-trash fa-lg" />
                </button>
            </template>
            <p>
                <b>{{ $t('stdout') }}</b>
                (
                <a :href="page.instance.raw_stdout" target="_blank">
                    {{ $t('full raw stdout') | capitalize }}
                </a>
                )
                <i v-show="loading" class="fa fa-spinner fa-pulse fa-fw" />
                <i
                    class="fas fa-angle-double-down float-right cursor-pointer"
                    :class="{ 'opacity-05': !stickToBottom }"
                    @click="scrollToBottom"
                />
            </p>
            <pre ref="output" class="history-stdout" @scroll="scrollHandler"><span
                v-for="line in preparedLines" :key="line.line_gnumber" v-html="ansiToHTML(line.line)"
            /></pre>
        </Card>
    </div>
</template>

<script>
    const LINES_LIMIT = 500;

    export default {
        components: {
            Card: spa.components.Card,
        },
        props: {
            page: { type: Object, required: true },
        },
        data: () => ({
            ansiToHTML: spa.colors.ansiToHTML,
            loading: false,
            hasLinesBefore: true,
            hasLinesAfter: true,
            updatingLinesAfterTimeoutId: null,
            lines: [],
            height: 0,
            scrollHeight: 0,
            scrollTop: 0,
        }),
        computed: {
            stickToBottom() {
                return this.scrollTop + this.height === this.scrollHeight;
            },
            linesPath() {
                return [...spa.utils.pathToArray(this.$route.path), 'lines'];
            },
            preparedLines() {
                return this.lines;
            },
        },
        async mounted() {
            this.loading = true;
            this.lines = await this.loadLines();
            this.$nextTick(() => this.scrollToBottom());
            if (this.page.isInProgress) {
                this.startUpdatingLinesAfter();
            }
            this.loading = false;
        },
        methods: {
            scrollToBottom() {
                this.$refs.output.scrollTop = this.$refs.output.scrollHeight - this.$refs.output.clientHeight;
            },
            ensureScrollPositionTheSame(func) {
                const scrollTopBefore = this.$refs.output.scrollTop;
                const scrollHeightBefore = this.$refs.output.scrollHeight;
                func();
                this.$nextTick(() => {
                    const scrollHeightAfter = this.$refs.output.scrollHeight;
                    this.$refs.output.scrollTop = scrollTopBefore + (scrollHeightAfter - scrollHeightBefore);
                });
            },
            clear() {
                this.page.executeAction(this.page.view.actions.get('clear'), this.page.instance);
            },
            async scrollHandler(e) {
                const target = e.target;
                this.height = target.clientHeight;
                this.scrollHeight = target.scrollHeight;
                this.scrollTop = target.scrollTop;
                if (!this.loading && this.hasLinesBefore && target.scrollTop <= 100) {
                    this.loading = true;
                    await this.loadMoreLinesBefore();
                    this.loading = false;
                }
            },
            async loadMoreLinesBefore() {
                const lines = await this.loadLines({ before: this.lines[0].line_gnumber });
                if (lines.length === 0) this.hasLinesBefore = false;
                this.ensureScrollPositionTheSame(() => this.lines.unshift(...lines));
            },
            async loadMoreLinesAfter() {
                const lines = await this.loadLines(
                    this.lines.last ? { after: this.lines.last.line_gnumber } : {},
                );
                if (lines.length === 0 && !this.page.isInProgress) this.hasLinesAfter = false;
                this.ensureScrollPositionTheSame(() => this.lines.unshift(...lines));
            },
            startUpdatingLinesAfter() {
                this.updatingLinesAfterTimeoutId = setTimeout(async () => {
                    this.loading = true;
                    await this.loadMoreLinesAfter();
                    this.loading = false;
                    if (this.updatingLinesAfterTimeoutId) {
                        this.startUpdatingLinesAfter();
                    }
                }, 2000);
            },
            stopUpdatingLinesAfter() {
                clearTimeout(this.updatingLinesAfterTimeoutId);
                this.updatingLinesAfterTimeoutId = null;
            },
            /**
             * @param {Object} [query]
             * @return {Promise<Object[]>}
             */
            async loadLines(query = {}) {
                const response = await this.$app.api.makeRequest({
                    method: spa.utils.HttpMethods.GET,
                    path: this.linesPath,
                    query: { limit: LINES_LIMIT, ...query },
                    useBulk: true,
                });
                return response.data.results.reverse();
            },
        },
    };
</script>

<style scoped>
    .opacity-05 {
        opacity: 0.5;
    }
    .history-stdout {
        background-color: #000;
        color: #ececec;
        overflow-x: auto;
        overflow-y: scroll;
        min-height: 300px;
        max-height: 350px;
        padding-left: 15px;
        padding-right: 15px;
        font-weight: normal !important;
    }
</style>
