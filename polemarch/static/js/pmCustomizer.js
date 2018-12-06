tabSignal.connect('guiSkin.default.init', function(obj)
{
    let form = obj.guiSkin.options.form;

    form['history_status_ok'] = {
        color_var:"--history-status-ok",
        title:'History status ok',
        format:'color',
        type: "string",
        default:"#276900",
        priority: 41,
        value:obj.guiSkin.value.history_status_ok,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_error'] = {
        color_var:"--history-status-error",
        title:'History status error',
        format:'color',
        type: "string",
        default:"#dc3545",
        priority: 42,
        value:obj.guiSkin.value.history_status_error,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_interrupted'] = {
        color_var:"--history-status-interrupted",
        title:'History status interrupted',
        format:'color',
        type: "string",
        default:"#9b97e4",
        priority: 43,
        value:obj.guiSkin.value.history_status_interrupted,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_delay'] = {
        color_var:"--history-status-delay",
        title:'History status delay',
        format:'color',
        type: "string",
        default:"#808419",
        priority: 44,
        value:obj.guiSkin.value.history_status_delay,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_offline'] = {
        color_var:"--history-status-offline",
        title:'History status offline',
        format:'color',
        type: "string",
        default:"#9e9e9e",
        priority: 45,
        value:obj.guiSkin.value.history_status_offline,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_run'] = {
        color_var:"--history-status-run",
        title:'History status run',
        format:'color',
        type: "string",
        default:"#0085ff",
        priority: 46,
        value:obj.guiSkin.value.history_status_run,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };


    form['project_status_new'] = {
        color_var:"--project-status-new",
        title:'Project status new',
        format:'color',
        type: "string",
        default:"#bf71b7",
        priority: 47,
        value:obj.guiSkin.value.project_status_new,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_error'] = {
        color_var:"--project-status-error",
        title:'Project status error',
        format:'color',
        type: "string",
        default:"#dc3545",
        priority: 48,
        value:obj.guiSkin.value.project_status_error,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_ok'] = {
        color_var:"--project-status-ok",
        title:'Project status ok',
        format:'color',
        type: "string",
        default:"#276900",
        priority: 49,
        value:obj.guiSkin.value.project_status_ok,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_wait_sync'] = {
        color_var:"--project-status-wait-sync",
        title:'Project status wait_sync',
        format:'color',
        type: "string",
        default:"#0085ff",
        priority: 50,
        value:obj.guiSkin.value.project_status_wait_sync,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_sync'] = {
        color_var:"--project-status-sync",
        title:'Project status sync',
        format:'color',
        type: "string",
        default:"#ff8c00",
        priority: 51,
        value:obj.guiSkin.value.project_status_sync,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['chart_legend_text_color'] = {
        color_var:"--chart-legend-text-color",
        title:'Chart legend text color',
        format:'color',
        type: "string",
        default:"#666666",
        priority: 52,
        value:obj.guiSkin.value.chart_legend_text_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['chart_axes_text_color'] = {
        color_var:"--chart-axes-text-color",
        title:'Chart legend text color',
        format:'color',
        type: "string",
        default:"#666666",
        priority: 53,
        value:obj.guiSkin.value.chart_axes_text_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['chart_axes_lines_color'] = {
        color_var:"--chart-axes-lines-color",
        title:'Chart axes lines color',
        format:'color',
        type: "string",
        default:"#efefef",
        priority: 54,
        value:obj.guiSkin.value.chart_axes_lines_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };
});


tabSignal.connect('guiSkin.dark.init', function(obj)
{
    let form = obj.guiSkin.options.form;

    form['history_status_ok'] = {
        color_var:"--history-status-ok",
        title:'History status ok',
        format:'color',
        type: "string",
        default:"#56E401",
        priority: 41,
        value:obj.guiSkin.value.history_status_ok,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_error'] = {
        color_var:"--history-status-error",
        title:'History status error',
        format:'color',
        type: "string",
        default:"#F61328",
        priority: 42,
        value:obj.guiSkin.value.history_status_error,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_interrupted'] = {
        color_var:"--history-status-interrupted",
        title:'History status interrupted',
        format:'color',
        type: "string",
        default:"#B68CF3",
        priority: 43,
        value:obj.guiSkin.value.history_status_interrupted,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_delay'] = {
        color_var:"--history-status-delay",
        title:'History status delay',
        format:'color',
        type: "string",
        default:"#DBEA10",
        priority: 44,
        value:obj.guiSkin.value.history_status_delay,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_offline'] = {
        color_var:"--history-status-offline",
        title:'History status offline',
        format:'color',
        type: "string",
        default:"#90C1C0",
        priority: 45,
        value:obj.guiSkin.value.history_status_offline,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['history_status_run'] = {
        color_var:"--history-status-run",
        title:'History status run',
        format:'color',
        type: "string",
        default:"#00D7FF",
        priority: 46,
        value:obj.guiSkin.value.history_status_run,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };


    form['project_status_new'] = {
        color_var:"--project-status-new",
        title:'Project status new',
        format:'color',
        type: "string",
        default:"#D48CCA",
        priority: 47,
        value:obj.guiSkin.value.project_status_new,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_error'] = {
        color_var:"--project-status-error",
        title:'Project status error',
        format:'color',
        type: "string",
        default:"#F61328",
        priority: 48,
        value:obj.guiSkin.value.project_status_error,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_ok'] = {
        color_var:"--project-status-ok",
        title:'Project status ok',
        format:'color',
        type: "string",
        default:"#56E401",
        priority: 49,
        value:obj.guiSkin.value.project_status_ok,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_wait_sync'] = {
        color_var:"--project-status-wait-sync",
        title:'Project status wait_sync',
        format:'color',
        type: "string",
        default:"#00D7FF",
        priority: 50,
        value:obj.guiSkin.value.project_status_wait_sync,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['project_status_sync'] = {
        color_var:"--project-status-sync",
        title:'Project status sync',
        format:'color',
        type: "string",
        default:"#FF9600",
        priority: 51,
        value:obj.guiSkin.value.project_status_sync,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['chart_legend_text_color'] = {
        color_var:"--chart-legend-text-color",
        title:'Chart legend text color',
        format:'color',
        type: "string",
        default:"#cccccc",
        priority: 52,
        value:obj.guiSkin.value.chart_legend_text_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

     form['chart_axes_text_color'] = {
        color_var:"--chart-axes-text-color",
        title:'Chart axes lines color',
        format:'color',
        type: "string",
        default:"#cccccc",
        priority: 53,
        value:obj.guiSkin.value.chart_axes_text_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };

    form['chart_axes_lines_color'] = {
        color_var:"--chart-axes-lines-color",
        title:'Chart axes lines color',
        format:'color',
        type: "string",
        default:"#bababa",
        priority: 54,
        value:obj.guiSkin.value.chart_axes_lines_color,
        onchange:() => {
            obj.guiSkin.applySettings()
        },
    };
});