import HistoryChartContentHeader from './HistoryChartContentHeader.vue';
import HistoryChartContentBody from './HistoryChartContentBody.vue';

/**
 * Component for guiWidgets.history_chart.
 */
const HistoryChart = {
    name: 'w_history_chart',
    mixins: [spa.components.mixins.LineChartMixin],
    data() {
        return {
            with_content_header: true,
        };
    },
    components: {
        content_header: HistoryChartContentHeader,
        content_body: HistoryChartContentBody,
    },
};

export default HistoryChart;
