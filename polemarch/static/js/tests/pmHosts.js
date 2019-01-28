
window.qunitTestsArray['guiPaths.host'] = {
    test:function()
    {
        let env = {};
        let pk_obj = {};

        //////////////////////////////////////////////////////
        // Test path /host/ (list, new page, page, edit page)
        /////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/host/",{
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
        // Test path /host/{pk}/variables/ (list, new page, page, edit page)
        ////////////////////////////////////////////////////////////////////

        guiTests.testForPathInternalLevel("/host/{pk}/variables/",{
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

        // deletes host
        guiTests.deleteObjByPath("/host/{pk}/", env, pk_obj);
    }
}