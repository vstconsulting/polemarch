/**
 * File with tests for /user/ view.
 */

import { guiTests } from './PmGUITests.js';

/**
 * Tests for views connected with User Model.
 */
tests.runner.module('guiViews[user.pm]', null, () => {
    let list_path = '/user/';
    let page_path = list_path + '{' + spa.utils.path_pk_key + '}/';
    let instances_info = guiTests.getEmptyInstancesInfo();

    // creates random user, data of which will be used in following tests.
    guiTests.createRandomUser(instances_info, true);

    /////////////////////////////////////////////////////////////////
    // Test for /user/{pk}/settings/ view
    /////////////////////////////////////////////////////////////////
    guiTests.testPageView(page_path + 'settings/', instances_info, true);

    /////////////////////////////////////////////////////////////////
    // Test for /user/{pk}/settings/edit/ view
    /////////////////////////////////////////////////////////////////
    guiTests.testPageEditView(page_path + 'settings/edit/', instances_info, {}, false);
});

/**
 * Test for 'profile' views.
 */
tests.runner.module('guiViews[profile.pm]', null, () => {
    let instances_info = {
        url_params: {},
        key_fields_data: {},
    };

    /////////////////////////////////////////////////////////////////
    // Test for /profile/settings/ view
    /////////////////////////////////////////////////////////////////
    guiTests.testPageView('/profile/settings/', instances_info, true);

    /////////////////////////////////////////////////////////////////
    // Test for /profile/settings/edit/ view
    /////////////////////////////////////////////////////////////////
    guiTests.openPage('/profile/settings/edit/', instances_info.url_params);
});
