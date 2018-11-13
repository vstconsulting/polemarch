
window.qunitTestsArray['guiPaths.group'] = {
    test:function()
    {
        let path = '/group/'
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