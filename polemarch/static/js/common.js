tabSignal.connect("app.beforeInit", ({app}) => {
    if(app && window.moment && window.moment.tz) {
        window.moment.tz.setDefault(app.api.getTimeZone());
    }
});

if(guiLocalSettings.get('hideMenu')) {
    if(window.innerWidth>767) {
        $("body").addClass('sidebar-collapse');
    }
}

// Adds tests files to the common list of GUI tests
window.guiTestsFiles.push('js/tests/pmTests.js');
window.guiTestsFiles.push('js/tests/pmFields.js');
window.guiTestsFiles.push('js/tests/pmUsers.js');
window.guiTestsFiles.push('js/tests/pmHistory.js');
window.guiTestsFiles.push('js/tests/pmHooks.js');
window.guiTestsFiles.push('js/tests/pmHosts.js');
window.guiTestsFiles.push('js/tests/pmGroups.js');
window.guiTestsFiles.push('js/tests/pmInventories.js');
window.guiTestsFiles.push('js/tests/pmProjects.js');
window.guiTestsFiles.push('js/tests/pmDashboard.js');
