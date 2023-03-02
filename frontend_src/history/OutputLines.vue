<template>
    <div class="col-md-6 output-lines">
        <Card card-body-classes="p-0" :title="`${$t('Execution output')} (${$t('stdout')})`">
            <template #tools>
                <button v-show="isLoading" type="button" class="btn btn-tool">
                    <i class="fa fa-spinner fa-pulse fa-fw" />
                </button>
                <a
                    class="btn btn-tool"
                    :href="app.store.page.instance.raw_stdout"
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
                ref="outputEl"
                class="history-stdout"
                @scroll="handleScroll"
            ><HistoryLineVue v-for="(lineObj, idx) in lines" :key="idx" :content="lineObj.line" />
            </pre>
        </Card>
    </div>
</template>

<script setup>
    import { ref, onMounted, nextTick } from 'vue';
    import HistoryLineVue from './HistoryLine.vue';
    const Card = spa.components.Card;

    const LINES_LIMIT = 500;

    const app = spa.getApp();

    const linesUrl = spa.utils.joinPaths(app.router.currentRoute.path, '/lines/');

    spa.autoupdate.useAutoUpdate({
        labels: ['history_lines'],
        pk: app.store.page.instance.getPkValue(),
        callback: loadLines,
    });

    const isLoading = ref(false);
    const lines = ref([]);
    const outputEl = ref(null);

    onMounted(() => {
        loadLines();
    });

    async function sendLinesRequest(query = {}) {
        isLoading.value = true;
        const response = await app.api.makeRequest({
            method: spa.utils.HttpMethods.GET,
            path: linesUrl,
            query,
            useBulk: true,
        });
        isLoading.value = false;
        return response;
    }

    async function loadLines({ ascending = false } = {}) {
        const query = { limit: LINES_LIMIT, ordering: '-line_gnumber' };

        if (lines.value.length > 0) {
            if (ascending) {
                if (lines.value.at(0).line_gnumber === 1) return;
                query.before = lines.value.at(0).line_gnumber;
            } else {
                query.after = lines.value.at(-1).line_gnumber;
            }
        }

        const response = await sendLinesRequest(query);
        saveLines({ newLines: response.data.results, ascending });

        if (!ascending && !isLoading.value && outputEl.value.scrollHeight - outputEl.value.scrollTop < 800) {
            nextTick(() => {
                outputEl.value.scroll({ top: outputEl.value.scrollHeight });
            });
        }
    }

    function isSameLine(first, second) {
        return first.line_number === second.line_number && first.line_gnumber === second.line_gnumber;
    }

    function saveLines({ newLines = [], ascending = false } = {}) {
        if (!ascending) {
            newLines = newLines.reverse();
        }
        for (const newLine of newLines) {
            if (!lines.value.some((line) => isSameLine(line, newLine))) {
                if (ascending) {
                    lines.value.unshift(newLine);
                } else {
                    lines.value.push(newLine);
                }
            }
        }
    }

    async function clear() {
        isLoading.value = true;
        try {
            const responses = await Promise.all([
                app.api.makeRequest({
                    method: spa.utils.HttpMethods.DELETE,
                    path: spa.utils.joinPaths(app.router.currentRoute.path, '/clear/'),
                    useBulk: true,
                }),
                sendLinesRequest(),
            ]);
            lines.value = responses[1].data.results;
        } catch (e) {
            app.error_handler.defineErrorAndShow(e.data.detail);
        } finally {
            isLoading.value = false;
        }
    }

    function toggleMaximize() {
        document.body.classList.toggle('output-lines-maximized');
    }

    function _throttle(func, delay = 400) {
        let shouldWait = false;
        return (...args) => {
            if (shouldWait) return;
            func(...args);
            shouldWait = true;
            setTimeout(() => {
                shouldWait = false;
            }, delay);
        };
    }

    const _loadTopThrottled = _throttle(async (prevHeight) => {
        await loadLines({ ascending: true });
        const newScroll = outputEl.value.scrollHeight - prevHeight;
        if (newScroll > 0) {
            outputEl.value.scroll({ top: newScroll });
        }
    });

    async function handleScroll() {
        if (outputEl.value.scrollTop > 600) {
            return;
        }
        const prevHeight = outputEl.value.scrollHeight;
        _loadTopThrottled(prevHeight);
    }
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
