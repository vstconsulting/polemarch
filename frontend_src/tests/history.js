/**
 * File with tests for history views, that are not nested in other views.
 */

import { guiTests } from './PmGUITests.js';

/**
 * Test for history views:
 * - /history/.
 */
tests.runner.module('guiViews[history]', null, () => {
    let list_path = '/history/';
    let instances_info = guiTests.getEmptyInstancesInfo();

    guiTests.testListView(list_path, instances_info);
});
