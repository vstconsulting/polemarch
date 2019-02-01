window.qunitTestsArray['guiPaths.inventory'] = {
    test:function()
    {
        let env = {};
        let pk_obj = {};

        // creates user needed for some following tests
        guiTests.createUser(env, pk_obj);


        ///////////////////////////////////////////////////////////
        // Test path /inventory/ (list, new page, page, edit page)
        ///////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/",{
            create:[
                {
                    is_valid:true,
                    data:  {
                        name:{value:rundomString(6)},
                        notes:{value:rundomString(6)},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data: {
                        notes:{value:rundomString(6)},
                    },
                },
            ]
        }, env, pk_obj, true);


        ////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/copy/
        ///////////////////////////////////////////////////////////////////

        guiTests.copyObjectByPath("/inventory/{pk}/copy/", {
            data:{
                name:{value:rundomString(6)},
            },
            page:{
                delete: true,
            },
        }, env, pk_obj);


        ////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/set_owner/
        ///////////////////////////////////////////////////////////////////

        guiTests.executeAction("/inventory/{pk}/set_owner/", {
            data: function() { return {
                user_id: {
                    value: {id: env.user_id, text: env.user_name},
                    do_not_compare:true,
                }
            }}
        }, env, pk_obj);


        ///////////////////////////////////////////////////////////
        // Test path /inventory/import_inventory/
        ///////////////////////////////////////////////////////////
        guiTests.importInventory("/inventory/", {
            page: {
                delete: true,
            }
        }, env, pk_obj);


        /////////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/variables/ (list, new page, page, edit page)
        /////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/{pk}/variables/",{
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


        /////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/group/ (list, new page, page, edit page)
        /////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/{pk}/group/",{
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


        ////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/group/{group_id}/set_owner/
        ///////////////////////////////////////////////////////////////////

        guiTests.executeAction("/inventory/{pk}/group/{group_id}/set_owner/", {
            data: function() { return {
                user_id: {
                    value: {id: env.user_id, text: env.user_name},
                    do_not_compare:true,
                }
            }}
        }, env, pk_obj);

        //////////////////////////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/group/{group_id}/variables/ (list, new page, page, edit page)
        //////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/{pk}/group/{group_id}/variables/",{
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


        ////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/host/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/{pk}/host/",{
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


        ////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/host/{host_id}/set_owner/
        ///////////////////////////////////////////////////////////////////

        guiTests.executeAction("/inventory/{pk}/host/{host_id}/set_owner/", {
            data: function() { return {
                user_id: {
                    value: {id: env.user_id, text: env.user_name},
                    do_not_compare:true,
                }
            }}
        }, env, pk_obj);


        ////////////////////////////////////////////////////////////////////////////////////////
        // Test path /inventory/{pk}/host/{host_id}/variables/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/inventory/{pk}/host/{host_id}/variables/",{
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


        /////////////////////////////////////////////////////
        // Test path /inventory/{pk}/all_groups/ (list, page)
        /////////////////////////////////////////////////////

        guiTests.openPage("/inventory/{pk}/all_groups/", env, (env) => {
            return vstMakeLocalApiUrl("/inventory/{pk}/all_groups/", pk_obj)
        });
        guiTests.openPage("/inventory/{pk}/all_groups/{all_groups_id}", env, (env) => {
            return vstMakeLocalApiUrl("/inventory/{pk}/all_groups/{group_id}/", pk_obj)
        });


        ////////////////////////////////////////////////////
        // Test path /inventory/{pk}/all_hosts/ (list, page)
        ////////////////////////////////////////////////////

        guiTests.openPage("/inventory/{pk}/all_hosts/", env, (env) => {
            return vstMakeLocalApiUrl("/inventory/{pk}/all_hosts/", pk_obj)
        });
        guiTests.openPage("/inventory/{pk}/all_groups/{all_hosts_id}", env, (env) => {
            return vstMakeLocalApiUrl("/inventory/{pk}/all_hosts/{host_id}/", pk_obj)
        });


        // deletes remaining objects
        [
            "/inventory/{pk}/host/{host_id}/",
            "/host/{host_id}/",
            "/inventory/{pk}/group/{group_id}/",
            "/group/{group_id}/",
            "/inventory/{pk}/",
            "/user/{user_id}/",
        ].forEach((path) => {
            guiTests.deleteObjByPath(path, env, pk_obj);
        })
    }
}