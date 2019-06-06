/**
 * Mixin, that extends guiSkins.default.
 */
var pmSkinDefaultMixin = {
    history_status_ok: {
        color_var:"--history-status-ok",
        title:'History status ok',
        format:'color',
        default:"#276900",
        // priority: 41,
    },

    history_status_error: {
        color_var:"--history-status-error",
        title:'History status error',
        format:'color',
        default:"#dc3545",
        // priority: 42,
    },

    history_status_interrupted: {
        color_var:"--history-status-interrupted",
        title:'History status interrupted',
        format:'color',
        default:"#9b97e4",
        // priority: 43,
    },

    history_status_delay: {
        color_var:"--history-status-delay",
        title:'History status delay',
        format:'color',
        default:"#808419",
        // priority: 44,
    },

    history_status_offline: {
        color_var:"--history-status-offline",
        title:'History status offline',
        format:'color',
        default:"#9e9e9e",
        // priority: 45,
    },

    history_status_run: {
        color_var:"--history-status-run",
        title:'History status run',
        format:'color',
        default:"#0085ff",
        // priority: 46,
    },


    project_status_new: {
        color_var:"--project-status-new",
        title:'Project status new',
        format:'color',
        default:"#bf71b7",
        // priority: 47,
    },

    project_status_error: {
        color_var:"--project-status-error",
        title:'Project status error',
        format:'color',
        default:"#dc3545",
        // priority: 48,
    },

    project_status_ok: {
        color_var:"--project-status-ok",
        title:'Project status ok',
        format:'color',
        default:"#276900",
        // priority: 49,
    },

    project_status_wait_sync: {
        color_var:"--project-status-wait-sync",
        title:'Project status wait_sync',
        format:'color',
        default:"#0085ff",
        // priority: 50,
    },

    project_status_sync: {
        color_var:"--project-status-sync",
        title:'Project status sync',
        format:'color',
        default:"#ff8c00",
        // priority: 51,
    },

    chart_legend_text_color: {
        color_var:"--chart-legend-text-color",
        title:'Chart legend text color',
        format:'color',
        default:"#666666",
        // priority: 52,
    },

    chart_axes_text_color: {
        color_var:"--chart-axes-text-color",
        title:'Chart legend text color',
        format:'color',
        default:"#666666",
        // priority: 53,
    },

    chart_axes_lines_color: {
        color_var:"--chart-axes-lines-color",
        title:'Chart axes lines color',
        format:'color',
        default:"#efefef",
        // priority: 54,
    },
};

guiSkins.default = $.extend(true, guiSkins.default, pmSkinDefaultMixin);

/**
 * Mixin, that extends guiSkins.dark.
 */
var pmSkinDarkMixin = {
    history_status_ok: {
        default:"#56E401",
    },

    history_status_error: {
        default:"#F61328",
    },

    history_status_interrupted: {
        default:"#B68CF3",
    },

    history_status_delay: {
        default:"#DBEA10",
    },

    history_status_offline: {
        default:"#90C1C0",
    },

    history_status_run: {
        default:"#00D7FF",
    },

    project_status_new: {
        default:"#D48CCA",
    },

    project_status_error: {
        default:"#F61328",
    },

    project_status_ok: {
        default:"#56E401",
    },

    project_status_wait_sync: {
        default:"#00D7FF",
    },

    project_status_sync: {
        default:"#FF9600",
    },

    chart_legend_text_color: {
        default:"#cccccc",
    },

    chart_axes_text_color: {
        default:"#cccccc",
    },

    chart_axes_lines_color: {
        default:"#bababa",
    },
};

guiSkins.dark = $.extend(true, {}, guiSkins.default, guiSkins.dark, pmSkinDarkMixin);