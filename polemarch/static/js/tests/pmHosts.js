/**
 * File with tests for host views.
 */

/**
 * Tests for views connected with Host Model.
 */
window.qunitTestsArray['guiViews[host]'] = {
    test: function() {
        let list_path = '/host/';
        let page_path = list_path + '{' + path_pk_key + '}/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        // creates random user, data of which will be used in following tests.
        guiTests.createRandomUser(instances_info);

        /////////////////////////////////////////////////////////////////
        // Test for set of /host/ views (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(list_path, instances_info, {
            new: [
                {
                    is_valid: false,
                    data: {
                        name: {value: "@@@",},
                    },
                },
                {
                    is_valid: true,
                    data: {
                        name: {value: randomString(6),},
                        notes: {value: randomString(6),},
                        type: {value: "RANGE",},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        name: {value: randomString(6) + randomString(6)},
                    },
                },
            ],
        }, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Test for set of /host/{pk}/variables/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "variables/", instances_info, {
            new: [
                {
                    is_valid:true,
                    data: {
                        key: {value:"ansible_user"},
                        value: {value: "ubuntu"},
                    },
                },
            ],
            edit: [
                {
                    is_valid:true,
                    data: {
                        value: {value: "centos"},
                    },
                },
            ],
            page: {
                remove: true,
            },
        }, false);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /host/{pk}/copy/ views
        ////////////////////////////////////////////////////////////////////////////////
        // Test for INVALID COPY
        guiTests.copyInstanceFromPageView(page_path, instances_info, {
            is_valid: false,
            data: {
                name: {value: 'copied_host_321',},
                type: {value: 'HOST'},
            }
        });
        // Test for VALID COPY
        guiTests.copyInstanceFromPageView(page_path, instances_info, {
            is_valid: true,
            remove: true,
            data: {
                name: {value: 'copied-host-321',},
                type: {value: 'RANGE'},
            }
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /host/{pk}/set_owner/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path, instances_info, {
            is_valid: true,
            action: 'set_owner',
            data: () => {
                return {
                    user_id: {
                        value: {
                            prefetch_value: instances_info.key_fields_data.user.username,
                            value: instances_info.key_fields_data.user.id,
                        },
                        do_not_compare: true,
                    },
                };
            },
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Tests, that delete created during tests instances.
        ////////////////////////////////////////////////////////////////////////////////
        [
            page_path,
            "/user/{user_id}/",
        ].forEach((path) => {
            guiTests.testRemovePageViewInstance(path, instances_info, true);
        });
    },
};