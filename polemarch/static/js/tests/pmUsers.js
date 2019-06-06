/**
 * File with tests for /user/ view.
 */

/**
 * Tests for views connected with User Model.
 */
window.qunitTestsArray['guiViews[user.pm]'] = {
    test: function() {
        let list_path = '/user/';
        let page_path = list_path + '{' + path_pk_key + '}/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        // creates random user, data of which will be used in following tests.
        guiTests.createRandomUser(instances_info, true);

        /////////////////////////////////////////////////////////////////
        // Test for /user/{pk}/settings/ view
        /////////////////////////////////////////////////////////////////
        guiTests.testPageView(page_path + "settings/", instances_info, true);

        /////////////////////////////////////////////////////////////////
        // Test for /user/{pk}/settings/edit/ view
        /////////////////////////////////////////////////////////////////
        guiTests.testPageEditView(page_path + "settings/edit/", instances_info, {}, false);
    },
};

/**
 * Test for 'profile' views.
 */
window.qunitTestsArray['guiViews[profile.pm]'] = {
    test: function() {
        let instances_info = {
            url_params: {},
            key_fields_data : {},
        };

        /////////////////////////////////////////////////////////////////
        // Test for /profile/settings/ view
        /////////////////////////////////////////////////////////////////
        guiTests.testPageView("/profile/settings/", instances_info, true);

        /////////////////////////////////////////////////////////////////
        // Test for /profile/settings/edit/ view
        /////////////////////////////////////////////////////////////////
        guiTests.openPage("/profile/settings/edit/", instances_info.url_params);
    },
};