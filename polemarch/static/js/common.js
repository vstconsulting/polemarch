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

// Add tests files to the common list of GUI tests
/**/
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmElements.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHook.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHosts.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmUsers.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmGroups.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmHistory.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmDashboard.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmInventories.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/pmProjects.js')

