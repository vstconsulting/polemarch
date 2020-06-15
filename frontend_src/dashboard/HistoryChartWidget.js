import LineChartWidget from './LineChartWidget.js';

/**
 * Class of history chart widget.
 */
export default class HistoryChartWidget extends LineChartWidget {
    constructor(options) {
        super(options);

        this.format = 'history_chart';
        this.period = options.period;
        this.date_format = 'DD.MM.YY';

        Object.defineProperty(this, 'chart_options', {
            get: function () {
                return {
                    maintainAspectRatio: false,
                    legend: {
                        labels: {
                            fontColor: spa.guiCustomizer.guiCustomizer.skin.settings.chart_legend_text_color,
                        },
                    },
                    scales: {
                        yAxes: [
                            {
                                ticks: {
                                    beginAtZero: true,
                                    fontColor:
                                        spa.guiCustomizer.guiCustomizer.skin.settings.chart_axes_text_color,
                                },
                                gridLines: {
                                    color:
                                        spa.guiCustomizer.guiCustomizer.skin.settings.chart_axes_lines_color,
                                },
                            },
                        ],
                        xAxes: [
                            {
                                ticks: {
                                    fontColor:
                                        spa.guiCustomizer.guiCustomizer.skin.settings.chart_axes_text_color,
                                },
                                gridLines: {
                                    color:
                                        spa.guiCustomizer.guiCustomizer.skin.settings.chart_axes_lines_color,
                                },
                            },
                        ],
                    },
                    tooltips: {
                        mode: 'index',
                    },
                };
            },
        });
    }

    /**
     * Method, that returns chart start time moment (first period on xAxes) -
     * time in ISO 8601 format.
     * @return {number}
     * @private
     */
    _getChartStartTime() {
        // defines current months and year
        let monthNum = moment().format('MM');
        let yearNum = moment().format('YYYY');
        let dayNum = moment().format('DD');
        let hourNum = 'T00:00:00';
        let startTimeOrg = '';

        switch (this.period.type) {
            case 'year':
                startTimeOrg = yearNum + '-01-01' + hourNum;
                break;
            case 'month':
                startTimeOrg = yearNum + '-' + monthNum + '-01' + hourNum;
                break;
            case 'day':
                startTimeOrg = yearNum + '-' + monthNum + '-' + dayNum + hourNum;
                break;
        }

        return Number(
            moment(startTimeOrg)
                .subtract(this.period.amount - 1, this.period.type)
                .tz(app.api.getTimeZone())
                .format('x'),
        );
    }
    /**
     * Redefinition of '_formChartDataLabels' method of guiWidgets.line_chart class.
     * @returns {Array}
     * @private
     */
    _formChartDataLabels(raw_data) {
        /* jshint unused: false */
        let labels = [];
        let start_time = this._getChartStartTime();

        for (let i = -1; i < this.period.amount; i++) {
            // period up
            let time = +moment(start_time).add(i, this.period.type).tz(app.api.getTimeZone()).format('x');
            time = moment(time).tz(app.api.getTimeZone()).format(this.date_format);
            labels.push(time);
        }

        return labels;
    }
    /**
     * Redefinition of '_formChartDataDatasets_oneLine' method of guiWidgets.line_chart class.
     * @private
     */
    _formChartDataDatasets_oneLine(line, raw_data, labels) {
        let data = {};

        for (let index = 0; index < labels.length; index++) {
            data[labels[index]] = 0;
        }

        for (let index = 0; index < raw_data[this.period.type].length; index++) {
            let item = raw_data[this.period.type][index];

            let time = +moment(item[this.period.type]).tz(app.api.getTimeZone()).format('x');
            time = moment(time).tz(app.api.getTimeZone()).format(this.date_format);

            if (data[time] === undefined) {
                continue;
            }

            if (line.name.toLowerCase() == 'all_tasks') {
                data[time] = item.all;
            } else if (line.name.toLowerCase() == item.status.toLowerCase()) {
                data[time] = item.sum;
            }
        }

        return Object.values(data).map((item) => Number(item));
    }
    /**
     * Method, that form data sets for chart lines.
     * @param {object} raw_data Object with raw data for chart.
     * @param {array} labels Array with chart labels.
     * @return {Array}
     * @private
     */
    _formChartDataDatasets(raw_data, labels) {
        let datasets = [];

        for (let key in this.lines) {
            if (this.lines.hasOwnProperty(key)) {
                let line = this.lines[key];

                if (!line.active) {
                    continue;
                }

                datasets.push({
                    label: spa.utils._translate((line.title || line.name).toLowerCase()).toUpperCase(),
                    data: this._formChartDataDatasets_oneLine(line, raw_data, labels),
                    borderColor: this._getChartLineColor(line),
                    backgroundColor: this._getChartLineColor(line, true),
                });
            }
        }

        return datasets;
    }
    /**
     * Method, that returns current color for chart line.
     * @param {object} line Object with chart line settings.
     * @param {boolean} bg If true - color should be return for 'background-color' CSS property.
     * Otherwise, should be return for 'color' CSS property.
     * @private
     */
    _getChartLineColor(line, bg) {
        let alpha = 1;
        let prop = 'color';
        let skin = spa.guiCustomizer.guiCustomizer.skin.settings;

        if (bg) {
            alpha = 0.3;
            prop = 'bg_color';
        }

        if (skin['history_status_' + line.name]) {
            if (skin['history_status_' + line.name][0] == '#') {
                let color = hexToRgbA(skin['history_status_' + line.name], alpha); /* globals hexToRgbA */
                return color;
            }

            return skin['history_status_' + line.name];
        }

        return line[prop];
    }
    /**
     * Method, that returns data for widget progress bars - bars that show statistic info.
     * @param {object} raw_data Object with raw data for chart.
     * @returns {object}
     */
    getProgressBarsData(raw_data) {
        let all = 0;
        let data = {};

        for (let key in this.lines) {
            if (this.lines.hasOwnProperty(key)) {
                let line = this.lines[key];

                if (line.name == 'all_tasks') {
                    continue;
                }

                data[line.name] = {
                    all: all,
                    sum: 0,
                    status: line.name.toUpperCase(),
                };
            }
        }

        if (raw_data && raw_data.year) {
            let stats = raw_data.year;

            for (let index = 0; index < stats.length; index++) {
                let record = stats[index];
                let status = record.status.toLowerCase();

                if (!data[status]) {
                    continue;
                }

                data[status].sum += record.sum;
            }

            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    all += data[key].sum;
                }
            }

            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    data[key].all = all;
                }
            }
        }

        return data;
    }
    /**
     * Method, that sets chart period settings based on period.amount property.
     * @param {number} number New period.amount property.
     */
    setChartPeriod(number) {
        let amount, type;
        let num = Number(number);

        switch (num) {
            case 1095:
                amount = 3;
                type = 'year';
                break;
            case 365:
                amount = 13;
                type = 'month';
                break;
            case 90:
                amount = 3;
                type = 'month';
                break;
            default:
                amount = num;
                type = 'day';
                break;
        }

        this.period = {
            type: type,
            amount: amount,
            query_amount: num,
        };

        spa.utils.guiLocalSettings.set('chart_period', num);
    }
}
