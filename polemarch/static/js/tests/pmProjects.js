/**
 * File with tests for project views.
 */

/**
 * Tests for views connected with Project, ProjectVariable,
 * Template, TemplateVariable,
 * TemplateOption, TemplateOptionVariable,
 * PeriodicTask PeriodicTaskVariable Models.
 */
window.qunitTestsArray['guiViews[project]'] = {
    test: function() {
        let list_path = '/project/';
        let page_path = list_path + '{' + path_pk_key + '}/';
        let instances_info = guiTests.getEmptyInstancesInfo();

        // creates random user, data of which will be used in following tests.
        guiTests.createRandomUser(instances_info);

        ///////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/ views (list, page_new, page, page_edit)
        ///////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(list_path, instances_info, {
            new: [
                {
                    is_valid: true,
                    data:  {
                        name: {value: "git-project-from-tests"},
                        // type:{value: "MANUAL",},
                        type: {value: "GIT",},
                        repository: {value: "https://github.com/akhmadullin/ansible-test.git",},
                    },
                },
            ],
            edit: [
                {
                    is_valid:true,
                    data: {
                        notes: {value: "Just project for tests."},
                    },
                },
            ],
        }, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/sync/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.testProjectSyncFromPageView(page_path, instances_info, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/copy/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.copyInstanceFromPageView(page_path, instances_info, {
            is_valid: true,
            remove: true,
            data: {
                name: {value: randomString(8),},
            }
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/set_owner/ view
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

        /////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/variables/ (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "variables/", instances_info, {
            new:[
                {
                    is_valid: true,
                    data:  {
                        key: {value:"repo_sync_on_run"},
                        value: {value: true, do_not_compare: true,},
                    },
                },
            ],
            edit:[
                {
                    is_valid: true,
                    data: {
                        value:{value: false, do_not_compare: true,},
                    },
                },
            ],
            page: {
                remove: true,
            },
        }, false);

        // make btn tests
        guiTests.openPage(page_path + "module/", instances_info.url_params, true);
        guiTests.openPage(page_path + "playbook/", instances_info.url_params, true);


        ///////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/ views (list, page_new, page, page_edit)
        ///////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/", instances_info, {
            new: [
                {
                    is_valid:true,
                    data:  {
                        name:{value: randomString(6)},
                    },
                },
            ],
            edit: [
                {
                    is_valid:true,
                    data: {
                        name:{value: randomString(6)},
                    },
                },
            ],
            add_child: {
                child_path: '/inventory/',
                data: {
                    name: {value: 'child-inventory-' + randomString(6) + randomString(6)},
                },
            },
        }, false);

        ///////////////////////////////////////////////////////////
        // Test for /project/{pk}/inventory/import_inventory/ view
        ///////////////////////////////////////////////////////////
        guiTests.importInventoryFromListView(page_path + "inventory/", instances_info, {
            remove: true,
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Tests for /project/{pk}/inventory/{inventory_id}/set_owner/ view
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "inventory/{inventory_id}/", instances_info, {
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

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/variables/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/variables/", instances_info, {
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

        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/group/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/group/", instances_info, {
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

        /////////////////////////////////////////////////////////////////////////////////////
        // Tests for /project/{pk}/inventory/{inventory_id}/group/{group_id}/set_owner/ view
        ////////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "inventory/{inventory_id}/group/{group_id}/", instances_info, {
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

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/group/{group_id}/variables/ views (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/group/{group_id}/variables/", instances_info, {
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

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/group/{group_id}/host/ views (list, page_new, page, page_edit)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/group/{group_id}/host/", instances_info, {
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

        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/host/ views (list, page_new, page, page_edit)
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/host/", instances_info, {
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

        //////////////////////////////////////////////////////////////////////////////////
        // Tests for /project/{pk}/inventory/{inventory_id}/host/{host_id}/set_owner/ view
        //////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "inventory/{inventory_id}/host/{host_id}/", instances_info, {
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

        //////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/inventory/{inventory_id}/host/{host_id}/variables/ views
        // (list, page_new, page, page_edit)
        /////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "inventory/{inventory_id}/host/{host_id}/variables/", instances_info, {
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

        /////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/inventory/{inventory_id}/all_groups/ views (list, page)
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.openPage(page_path + "inventory/{inventory_id}/all_groups/", instances_info.url_params, true);
        guiTests.openPage(page_path + "inventory/{inventory_id}/all_groups/{group_id}/", instances_info.url_params, true);

        ////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/inventory/{inventory_id}/all_hosts/ views (list, page)
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.openPage(page_path + "inventory/{inventory_id}/all_hosts/", instances_info.url_params, true);
        guiTests.openPage(page_path + "inventory/{inventory_id}/all_hosts/{host_id}/", instances_info.url_params, true);


        //////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "template/", instances_info, {
            new: [
                {
                    is_valid: false,
                    data:  {
                        name:{ value: randomString(6)},
                    },
                },
                {
                    is_valid: false,
                    data:  {
                        name:{ value: randomString(6)},
                        kind: { value: "Task"},
                    },
                },
                {
                    is_valid: false,
                    data:  {
                        name:{ value: randomString(6)},
                        kind: { value: "Module"},
                    },
                },
                {
                    is_valid: true,
                    data:  {
                        name:{ value: randomString(6)},
                        kind:{ value: "Module"},
                        module: { value: "system.ping", do_not_compare: true,},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        name:{value: randomString(6)},
                    },
                },
                // {
                //     is_valid:false,
                //     data: {
                //         kind:{ value:"Task"},
                //     },
                // }
            ],
        }, false);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/{template_id}/variables/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "template/{template_id}/variables/", instances_info, {
            new: [
                {
                    is_valid:true,
                    data:  {
                        key: {value: "timeout"},
                        value: {value: 10},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        value: {value: 20},
                    },
                },
            ],
            page: {
                remove: true,
            },
        }, false);


        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/{template_id}/execute/ view - without option
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "template/{template_id}/", instances_info, {
            action: 'execute',
            is_valid: true,
            data: {},
        });

        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/{template_id}/option/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "template/{template_id}/option/", instances_info, {
            new: [
                {
                    is_valid:false,
                    data:  {
                        name:{ value:"new"},
                        module:{ value:"commands.shell", do_not_compare: true},
                        args:{ value:"uptime"},
                        group:{ value:"all"},
                    },
                },
                {
                    is_valid:false,
                    data:  {
                        name:{ value:"edit"},
                        module:{ value:"commands.shell", do_not_compare: true},
                        args:{ value:"uptime"},
                        group:{ value:"all"},
                    },
                },
                {
                    is_valid:true,
                    data:  {
                        name:{ value:"test"},
                        module:{ value:"commands.shell", do_not_compare: true},
                        args:{ value:"uptime"},
                        group:{ value:"all"},
                    },
                },
            ],
            edit: [
                {
                    is_valid:true,
                    data: {
                        args:{value:"help"},
                    },
                },
            ],
        }, false);

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/{template_id}/option/{option_id}/variables/ views
        // (list, page_new, page, page_edit)
        ///////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "template/{template_id}/option/{option_id}/variables/", instances_info, {
            new: [
                {
                    is_valid:true,
                    data:  {
                        key:{value: "timeout"},
                        value:{value: 30},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        value: {value: 60},
                    },
                },
            ],
            page: {
                remove: true,
            },
        }, false);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/template/{template_id}/execute/ view - with option
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path + "template/{template_id}/", instances_info, {
            action: 'execute',
            is_valid: true,
            data: function() {
                return {
                    option: {
                        value: {
                            value: instances_info.key_fields_data.option.name,
                            prefetch_value: instances_info.key_fields_data.option.name,
                        },
                        do_not_compare: true,
                    },
                };
            },
        });


        //////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/periodic_task/ views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "periodic_task/", instances_info, {
            new: [
                {
                    is_valid: false,
                    data:  {},
                },
                {
                    is_valid: false,
                    data:  {
                        name: {value: randomString(6)},
                        kind: {value: "TEMPLATE"},
                    },
                },
                {
                    is_valid: false,
                    data:  {
                        name: {value: randomString(6)},
                        kind: {value: "PLAYBOOK"},
                    },
                },
                {
                    is_valid: true,
                    data: function() {
                        return {
                            kind: {value: "TEMPLATE"},
                            template: {
                                value: {
                                    value: instances_info.key_fields_data.template.id,
                                    prefetch_value: instances_info.key_fields_data.template.name,
                                },
                                do_not_compare: true,
                            },
                            type: {value: "INTERVAL"},
                            schedule:{value: "00:00:12", do_not_compare:true},
                        };
                    },
                },
                {
                    is_valid: true,
                    data: function() {
                        return {
                            kind: {value: "TEMPLATE"},
                            template: {
                                value: {
                                    value: instances_info.key_fields_data.template.id,
                                    prefetch_value: instances_info.key_fields_data.template.name,
                                },
                                do_not_compare: true,
                            },
                            template_opt: {
                                value: {
                                    value: instances_info.key_fields_data.option.id,
                                    prefetch_value: instances_info.key_fields_data.option.name,
                                },
                                do_not_compare: true,
                            },
                            type: {value: "INTERVAL"},
                            schedule:{value: "00:00:12", do_not_compare:true},
                        };
                    },
                },
                {
                    is_valid: false,
                    data:  {
                        name: {value: randomString(6)},

                    },
                },
                {
                    is_valid: false,
                    data:  {
                        name: {value: randomString(6)},
                        kind: {value: "PLAYBOOK"},
                    },
                },
                {
                    is_valid: true,
                    data:  {
                        name: {value: randomString(6)},
                        kind: {value: "PLAYBOOK"},
                        mode: {value: "ping.yml", do_not_compare: true,},
                        type: {value: "CRONTAB"},
                        schedule: {value: "* * * * */2"},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        name:{value: randomString(6)},
                        save_result: {value: true},
                    },
                },
                {
                    is_valid: false,
                    data: {
                        kind: {value: "MODULE"},
                    },
                },
                {
                    is_valid: true,
                    data: {
                        kind: {value: "MODULE"},
                        mode: {value: "system.ping", do_not_compare:true},
                        type: {value: "INTERVAL"},
                        schedule:{value: "00:00:10", do_not_compare:true},
                    }
                },
            ],
        }, false);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/periodic_task/{periodic_task_id}/variables/
        // views (list, page_new, page, page_edit)
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.testSetOfViews(page_path + "periodic_task/{periodic_task_id}/variables/", instances_info, {
            new: [
                {
                    is_valid: true,
                    data: {
                        key: {value: "become"},
                        value: {value: true},
                    },
                },
            ],
            edit: [
                {
                    is_valid: true,
                    data: {
                        value: {value: false},
                    },
                },
            ],
            page: {
                remove: true,
            },
        }, false);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for set of /project/{pk}/periodic_task/{periodic_task_id}/execute/ view
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.openPage(page_path + "periodic_task/{periodic_task_id}/", instances_info.url_params);

        guiTests.clickAndWaitRedirect('.btn-action-execute', true);


        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test for /project/{pk}/history/ && /project/{pk}/history/{history_id}/ views
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        guiTests.openPage(page_path, instances_info.url_params, true);
        guiTests.clickAndWaitRedirect(".btn-sublink-history", true, (assert) => {
            assert.ok($('.item-row').length > 0, 'Project history records exist');
        });
        guiTests.clickAndWaitRedirect(".item-row", true);
        guiTests.clickAndWaitRedirect(".btn-operation-remove", true);

        ////////////////////////////////////////////////////////////////////////////////
        // Tests, that delete created during tests instances.
        ////////////////////////////////////////////////////////////////////////////////
        [
            page_path + "inventory/{inventory_id}/host/{host_id}/",
            "/host/{host_id}/",
            page_path + "inventory/{inventory_id}/group/{group_id}/",
            "/group/{group_id}/",
            page_path + "inventory/{inventory_id}/",
            "/inventory/{inventory_id}/",
            "/inventory/{imported_inventory_id}/",

            page_path + "template/{template_id}/option/{option_id}",
            page_path + "template/{template_id}/",
            page_path + "periodic_task/{periodic_task_id}/",

            page_path,
            "/user/{user_id}/",
        ].forEach((path) => {
            guiTests.testRemovePageViewInstance(path, instances_info, true);
        })
    },
};

window.qunitTestsArray['guiViews[community_template]'] = {
    test: function () {
        let list_path = "/community_template/";
        let page_path = list_path + '{' + path_pk_key + '}/';
        let instances_info = guiTests.getEmptyInstancesInfo();
        instances_info.url_params[path_pk_key] = 1;

        //////////////////////////////////////
        // Test for /community_template/ view
        //////////////////////////////////////
        guiTests.testListView(list_path, instances_info);

        /////////////////////////////////////////
        // Test for /community_template/{pk}/ view
        /////////////////////////////////////////
        guiTests.testPageView(list_path, instances_info, true);

        //////////////////////////////////////////////////
        // Test for /community_template/{pk}/use_it/ view
        /////////////////////////////////////////////////
        guiTests.executeActionFromSomeView(page_path, instances_info, {
            is_valid: true,
            action: 'use_it',
            data: {
                name: {value: 'test-community-project'},
            },
        }, (assert) => {
            guiTests.saveInstanceData(instances_info, true);
        });

        /////////////////////////////////////////////////////////////////
        // Tests sync created project and check, that sync was successful
        /////////////////////////////////////////////////////////////////
        guiTests.testProjectSyncFromPageView("/project/{" + path_pk_key + "}/", instances_info, true);

        syncQUnit.addTest('check quick playbook run form existence', function(assert) {
            let done = assert.async();
            assert.ok($(".quick-playbook-run-form").length == 1, 'quick playbook run form exists');
            testdone(done);
        });

        guiTests.openPage("/project/{" + path_pk_key + "}/playbook/", instances_info.url_params, true);

        syncQUnit.addTest('check community playbooks existence', function(assert) {
            let done = assert.async();
            assert.ok($(".item-row").length > 0, 'community playbooks exist');
            testdone(done);
        });

        ////////////////////////////////////////////////////////////////////////////////
        // Test, that deletes created during tests project instance.
        ////////////////////////////////////////////////////////////////////////////////
        guiTests.testRemovePageViewInstance("/project/{" + path_pk_key + "}/", instances_info, true);
    },
};