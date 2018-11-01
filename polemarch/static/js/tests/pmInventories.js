
window.qunitTestsArray['guiPaths.inventory'] = {
    test:function()
    {
        let path = '/inventory/'
        let params = {
            create:[
                {
                    is_valid:true,
                    data:{
                        notes:{
                            value:rundomString(6)
                        }
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data:{
                        notes : {value:rundomString(6)},
                        name : {value:rundomString(6)},
                    },
                },
            ]
        }
        guiTests.testForPath(path, params)
    }
}