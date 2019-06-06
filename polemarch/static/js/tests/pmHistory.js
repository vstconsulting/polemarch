/**
 * File with tests for history views, that are not nested in other views.
 */

/**
 * Test for history views:
 * - /history/.
 */
window.qunitTestsArray['guiViews[history]'] = {
    test: function() {
        let list_path = '/history/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        guiTests.testListView(list_path, instances_info);
    },
};