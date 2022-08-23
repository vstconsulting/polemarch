<template>
    <div class="col-md-6 output-lines">
        <Card card-body-classes="p-0" :title="title" :is-collapsable="false">
            <template #tools>
                <button v-show="loading" type="button" class="btn btn-tool">
                    <i class="fa fa-spinner fa-pulse fa-fw" />
                </button>
                <a
                    class="btn btn-tool"
                    :href="page.instance.raw_stdout"
                    :title="$t('Full raw stdout')"
                    target="_blank"
                >
                    <i class="fas fa-align-justify" />
                </a>
                <button type="button" class="btn btn-tool" :title="$t('Clear')" @click="clear">
                    <i class="fa fa-trash fa-lg" />
                </button>
                <button type="button" class="btn btn-tool d-none d-md-block" @click="toggleMaximize">
                    <i class="far fa-window-maximize" />
                    <i class="far fa-window-minimize" style="display: none" />
                </button>
            </template>
            <pre
                ref="output"
                class="history-stdout"
                @scroll="scrollHandler"
            ><HistoryLine v-for="line in gluedLines" :key="line.id" :content="line.text" /></pre>
        </Card>
    </div>
</template>

<script>
    import OldLinesMixin from './OldLinesMixin.js';

    /** @vue/component */
    const HistoryLine = {
        props: {
            content: { type: String, required: true },
        },
        computed: {
            htmlContent() {
                return spa.colors.ansiToHTML(this.content);
            },
        },
        render(h) {
            return h('span', { domProps: { innerHTML: this.htmlContent } });
        },
    };

    export default {
        components: {
            Card: spa.components.Card,
            HistoryLine,
        },
        mixins: [OldLinesMixin],
        props: {
            page: { type: Object, required: true },
        },
        data: () => ({
            loading: false,
        }),
        computed: {
            title() {
                return `${this.$t('Execution output')} (${this.$t('stdout')})`;
            },
            instance() {
                return this.page.instance;
            },
            rawInventory() {
                return this.instance.raw_inventory;
            },
        },
        methods: {
            clear() {
                this.page.executeAction(this.page.view.actions.get('clear'), this.page.instance);
            },
            toggleMaximize() {
                document.body.classList.toggle('output-lines-maximized');
            },
        },
    };
</script>

<style lang="scss">
    @media (min-width: 768px) {
        @media (prefers-reduced-motion: no-preference) {
            .page-history_id,
            .page-project_id_history_history_id {
                .output-lines,
                .history-info,
                .fields-group,
                .history-stdout {
                    transition-duration: 0.25s;
                    transition-timing-function: ease-in-out;
                }
            }
        }

        .page-history_id.output-lines-maximized,
        .page-project_id_history_history_id.output-lines-maximized {
            .output-lines,
            .history-info,
            .fields-group {
                flex: 0 0 100% !important;
                max-width: 100% !important;
            }
            .history-stdout {
                max-height: 500px;
            }
            .fa-window-maximize {
                display: none !important;
            }
            .fa-window-minimize {
                display: inline !important;
            }
        }
    }
    @media (max-width: 767.98px) {
        .output-lines {
            order: 1;
        }
        .history-info {
            order: 0;
        }
    }
</style>

<style scoped>
    .history-stdout {
        background-color: #000;
        color: #ececec;
        overflow-x: auto;
        overflow-y: scroll;
        height: 638px;
        padding: 0 15px;
        margin: 0;
        font-weight: normal !important;
        white-space: pre-wrap;
    }
</style>
