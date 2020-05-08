tabSignal.connect('app.beforeInit', ({ app }) => {
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
window.guiTestsFiles.push(
    'js/tests/pmTests.js',
    'js/tests/pmFields.js',
    'js/tests/pmUsers.js',
    'js/tests/pmHistory.js',
    'js/tests/pmHooks.js',
    'js/tests/pmHosts.js',
    'js/tests/pmGroups.js',
    'js/tests/pmInventories.js',
    'js/tests/pmProjects.js',
    'js/tests/pmDashboard.js',
);
