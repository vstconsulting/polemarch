
window.qunitTestsArray['guiPaths.host'] = {
    test:function()
    {
        let path = '/host/'
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
                        type : {value:"RANGE"},
                    },
                },
            ]
        }
        guiTests.testForPath(path, params)
    }
}