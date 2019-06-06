/**
 * File with tests for inventory views.
 */

/**
 * Tests for views connected with Inventory Model.
 */
window.qunitTestsArray['guiViews[inventory]'] = {
    test: function() {
        let list_path = '/inventory/';
        let page_path = list_path + '{' + path_pk_key + '}/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        // creates random user, data of which will be used in following tests.
        guiTests.createRandomUser(instances_info);

        ///////////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/ views (list, page_new, page, page_edit)
        ///////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(list_path, instances_info, {
            new: [
                {
                    is_valid: true,
                    data: {
                        name: {value: randomString(6),},
                        notes: {value: randomString(6),},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        notes: {value: randomString(6) + randomString(6)},
                    },
                },
            ],
        }, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /inventory/{pk}/copy/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.copyInstanceFromPageView(page_path, instances_info, {
            is_valid: true,
            remove: true,
            data: {
                name: {value: randomString(8),},
            }
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /inventory/{pk}/set_owner/ view
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

        ///////////////////////////////////////////////////////////
        // Test for /inventory/import_inventory/ view
        ///////////////////////////////////////////////////////////
        guiTests.importInventoryFromListView(list_path, instances_info, {
            remove: true,
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/variables/ views (list, page_new, page, page_edit)
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

        ////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/group/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "group/", instances_info, {
            new: [
                {
                    is_valid: true,
                    data: {
                        name: {value: randomString(6),},
                        notes: {value: randomString(6),},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        notes: {value: randomString(6) + randomString(6)},
                    },
                },
            ],
            add_child: {
                child_path: '/group/',
                data: {
                    name: {value: 'child-group-' + randomString(6) + randomString(6)},
                },
            },
        }, false);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /inventory/{pk}/group/{group_id}/set_owner/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "group/{group_id}/", instances_info, {
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

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/group/{group_id}/variables/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "group/{group_id}/variables/", instances_info, {
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

        ////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/group/{group_id}/host/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "group/{group_id}/host/", instances_info, {
            new: [
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
                        notes: {value: randomString(6) + randomString(6)},
                    },
                },
            ],
            add_child: {
                child_path: '/host/',
                data: {
                    name: {value: 'child-host-' + randomString(6) + randomString(6)},
                },
            },
            page: {
                remove: true,
            },
        }, false);

        ////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/host/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "host/", instances_info, {
            new: [
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
                        notes: {value: randomString(6) + randomString(6)},
                    },
                },
            ],
            add_child: {
                child_path: '/host/',
                data: {
                    name: {value: 'child-host-' + randomString(6) + randomString(6)},
                },
            },
        }, false);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /inventory/{pk}/host/{host_id}/set_owner/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "host/{host_id}/", instances_info, {
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

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /inventory/{pk}/host/{host_id}/variables/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "host/{host_id}/variables/", instances_info, {
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

        //////////////////////////////////////////////////////////
        // Test for /inventory/{pk}/all_groups/ views (list, page)
        //////////////////////////////////////////////////////////
        guiTests.openPage(page_path + "all_groups/", instances_info.url_params, true);
        guiTests.openPage(page_path + "all_groups/{group_id}/", instances_info.url_params, true);

        /////////////////////////////////////////////////////////
        // Test for /inventory/{pk}/all_hosts/ views (list, page)
        /////////////////////////////////////////////////////////
        guiTests.openPage(page_path + "all_hosts/", instances_info.url_params, true);
        guiTests.openPage(page_path + "all_hosts/{host_id}/", instances_info.url_params, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests, that delete created during tests instances.
        ////////////////////////////////////////////////////////////////////////////////
        [
            page_path + "host/{host_id}/",
            "/host/{host_id}/",
            page_path + "group/{group_id}/",
            "/group/{group_id}/",
            page_path,
            "/user/{user_id}/",
        ].forEach((path) => {
            guiTests.testRemovePageViewInstance(path, instances_info, true);
        });
    },
};