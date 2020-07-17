spa.signals.connect('app.beforeInit', ({ app }) => {
    if (app && window.moment && window.moment.tz) {
        window.moment.tz.setDefault(app.api.getTimeZone());
    }
});

if (spa.utils.guiLocalSettings.get('hideMenu')) {
    if (window.innerWidth > 767) {
        $('body').addClass('sidebar-collapse');
    }
}

// Adds tests files to the common list of GUI tests
spa.utils.guiTestsFiles.push('polemarch/pmTests.js');
