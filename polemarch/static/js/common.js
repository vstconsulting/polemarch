if(window.moment && window.moment.tz)
{
    window.moment.tz.setDefault(window.timeZone);
}

if(guiLocalSettings.get('hideMenu'))
{
    if(window.innerWidth>767){
        $("body").addClass('sidebar-collapse');
    }
}

// Adds tests files to the common list of GUI tests
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmTests.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmFields.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmUsers.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHistory.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHooks.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHosts.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmGroups.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmInventories.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmProjects.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmDashboard.js');
