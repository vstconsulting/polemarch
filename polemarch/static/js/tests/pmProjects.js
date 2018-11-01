
window.qunitTestsArray['guiPaths.project'] = {
    test:function()
    {
        let path = '/project/'
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
                    },
                },
            ]
        }
       //guiTests.testForPath(path, params)
    }
}

/*
window.qunitTestsArray['guiPaths.periodic_task'] = {
    test:function()
    {
        let path = '/periodic_task/'
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
                    },
                },
            ]
        }
        testForPath(path, params)
    }
}*/