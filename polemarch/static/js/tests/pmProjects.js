
window.qunitTestsArray['guiPaths.project'] = {
    test:function()
    {
        let env = {};
        let pk_obj = {};

        ////////////////////////////////////////////////////////
        // Test path /project/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        name:{value:rundomString(6)},
                        type:{value: "MANUAL", do_not_compare:true,},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ]
        }, env, pk_obj, true);


        ///////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/variables/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"repo_sync_on_run"},
                        value:{value: true},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value: false},
                    },
                },
            ],
            page: {
                delete: true,
            }
        }, env, pk_obj);

        guiTests.openPage("/project/{pk}/history/", env, (env) => {return vstMakeLocalApiUrl("/project/{pk}/history/", pk_obj)});
        guiTests.openPage("/project/{pk}/module/", env, (env) => {return vstMakeLocalApiUrl("/project/{pk}/module/", pk_obj)});
        guiTests.openPage("/project/{pk}/playbook/", env, (env) => {return vstMakeLocalApiUrl("/project/{pk}/playbook/", pk_obj)});


        ///////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                       name:{value:rundomString(6)},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ],
            list: {
                hasAddButton: true,
            },
            add_child: {
                path: '/inventory/',
                create:{
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                }
            },
        }, env, pk_obj);

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/variables/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/{inventory_id}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"ansible_user"},
                        value:{value: "ubuntu"},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value: "centos"},
                    },
                },
            ],
            page: {
                delete: true,
            }
        }, env, pk_obj);

        ////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/group/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/{inventory_id}/group/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                       name:{value:rundomString(6)},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ],
            list: {
                hasAddButton: true,
            },
            add_child: {
                path: '/group/',
                create:{
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                }
            },
        }, env, pk_obj);

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/group/{group_id}/variables/ (list, new page, page, edit page)
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/{inventory_id}/group/{group_id}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"ansible_user"},
                        value:{value: "ubuntu"},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value: "centos"},
                    },
                },
            ],
            page: {
                delete: true,
            }
        }, env, pk_obj);


        ////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/host/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/{inventory_id}/host/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                       name:{value:rundomString(6)},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ],
            list: {
                hasAddButton: true,
            },
            add_child: {
                path: '/host/',
                create:{
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                }
            },
        }, env, pk_obj);


        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/host/{host_id}/variables/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/inventory/{inventory_id}/host/{host_id}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"ansible_user"},
                        value:{value: "ubuntu"},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value: "centos"},
                    },
                },
            ],
            page: {
                delete: true,
            }
        }, env, pk_obj);


        /////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/all_groups/ (list, page)
        ////////////////////////////////////////////////////////////////////////////

        guiTests.openPage("/project/{pk}/inventory/{inventory_id}/all_groups/", env, (env) => {
            return vstMakeLocalApiUrl("/project/{pk}/inventory/{inventory_id}/all_groups/", pk_obj)
        });
        guiTests.openPage("/project/{pk}/inventory/{inventory_id}/all_groups/{all_groups_id}", env, (env) => {
            return vstMakeLocalApiUrl("/project/{pk}/inventory/{inventory_id}/all_groups/{group_id}/", pk_obj)
        });


        ////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/inventory/{inventory_id}/all_hosts/ (list, page)
        ///////////////////////////////////////////////////////////////////////////

        guiTests.openPage("/project/{pk}/inventory/{inventory_id}/all_hosts/", env, (env) => {
            return vstMakeLocalApiUrl("/project/{pk}/inventory/{inventory_id}/all_hosts/", pk_obj)
        });
        guiTests.openPage("/project/{pk}/inventory/{inventory_id}/all_groups/{all_hosts_id}", env, (env) => {
            return vstMakeLocalApiUrl("/project/{pk}/inventory/{inventory_id}/all_hosts/{host_id}/", pk_obj)
        });


        // @todo добавить проверку того что поля правильно меняются от значений других полей
        ///////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/template/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/template/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        name:{value:rundomString(6)},
                        kind:{value:"Module"},
                        module: {value: "ping"},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ]
        }, env, pk_obj);


        // //////////////////////////////////////////////////////////////////////////////////////////////
        // // Test path /project/{pk}/template/{template_id}/variables/ (list, new page, page, edit page)
        // //////////////////////////////////////////////////////////////////////////////////////////////
        //
        // guiTests.testForPathInternalLevel("/project/{pk}/template/{template_id}/variables/",{
        //     create:[
        //         {
        //             is_valid:true,
        //             data:  {
        //                 key:{value:"timeout"},
        //                 value:{value: 10},
        //             },
        //         },
        //     ],
        //     update:[
        //         {
        //             is_valid:true,
        //             data: {
        //                 value:{value: 20},
        //             },
        //         },
        //     ],
        //     // page: {
        //     //     delete: true,
        //     // }
        // }, env, pk_obj);

        ///////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/template/{template_id}/option/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/template/{template_id}/option/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        module:{value:"shell"},
                        args:{value:"uptime"},
                        group:{value:"all"},
                        name:{value:"test"},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        args:{value:"help"},
                    },
                },
            ]
        }, env, pk_obj);


        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/template/{template_id}/option/{option_id}/variables/ (list, new page, page, edit page)
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/template/{template_id}/option/{option_id}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"timeout"},
                        value:{value:30},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value:60},
                    },
                },
            ],
            // page: {
            //     delete: true,
            // },
        }, env, pk_obj);


        ///////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/periodic_task/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/periodic_task/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        name:{value:rundomString(6)},
                        kind:{value: "MODULE"},
                        mode: {value: "ping"},
                        type: {value: "INTERVAL"},
                        schedule:{value: "00:00:10", do_not_compare:true},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        name:{value:rundomString(6)},
                    },
                },
            ]
        }, env, pk_obj);


        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Test path /project/{pk}/periodic_task/{periodic_task_id}/variables/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/project/{pk}/periodic_task/{periodic_task_id}/variables/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        key:{value:"forks"},
                        value:{value:8},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        value:{value:10},
                    },
                },
            ],
            page: {
                delete: true,
            },
        }, env, pk_obj);


        // deletes remaining objects
        [
            "/project/{pk}/inventory/{inventory_id}/host/{host_id}/",
            "/host/{host_id}/",
            "/project/{pk}/inventory/{inventory_id}/group/{group_id}/",
            "/group/{group_id}/",
            "/project/{pk}/inventory/{inventory_id}/",
            "/inventory/{inventory_id}/",
            "/project/{pk}/template/{template_id}/option/{option_id}",
            "/project/{pk}/template/{template_id}/",
            "/project/{pk}/periodic_task/{periodic_task_id}/",
            "/project/{pk}/",
        ].forEach((path) => {
            guiTests.deleteObjByPath(path, env, pk_obj);
        })
    }
}



window.qunitTestsArray['guiPaths.community_template'] = {
    test: function () {
        // test path /community_template/
        let path = "/community_template/";
        guiTests.openPage(path);

        // test path /community_template/{pk}/
        path += "1/";
        guiTests.openPage(path);
        guiTests.hasElement(true, ".sublink-btn-use_it", path);

        // test path /community_template/{pk}/use_it/
        path += "use_it/";
        guiTests.testActionAndWaitRedirect(path, () => {
            $(".sublink-btn-use_it").trigger('click');
        })
        guiTests.hasElement(true, ".btn_exec", path);
        syncQUnit.addTest("guiPaths['"+path+"'] ", function ( assert )
        {
            let done = assert.async();
            let env = {};
            let fieldsData = {name:{value:"community_test_project"}};
            let values = guiTests.setValues(assert, fieldsData);
            guiTests.testActionAndWaitRedirect(path, () => {
                $(".btn_exec").trigger('click');
            })
            guiTests.compareValues(values, fieldsData);
            guiTests.deleteObject();
            assert.ok(true);
            testdone(done)
        });
    }
}
