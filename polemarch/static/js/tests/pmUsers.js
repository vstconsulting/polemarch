
window.qunitTestsArray['guiPaths.profile/settings'] = {
    test:function()
    {
        let path = "profile/settings"
        guiTests.openPage(path)
        guiTests.hasElement(1, ".btn_save", path)
        guiTests.hasEditButton(false)
        guiTests.hasAddButton(0, path)

        guiTests.hasElement(1, ".gui-field-chartLineSettings", path)

        guiTests.hasAddButton(0, path)

        $(".btn_save").trigger('click')

    }
};

window.qunitTestsArray['guiPaths.user.user_settings'] = {
    test:function()
    {
        let env = {};
        let pk_obj = {};
        let path = '/user/new/';
        let password = rundomString(6);
        let fieldsData = {
            username:{value:rundomString(6)},
            email: {value:rundomString(6) + "@gmail.com"},
            password:{value:password, do_not_compare:true},
            password2:{value:password, do_not_compare:true},
        };

        // creates user for testing user settings
        guiTests.openPage(path)
        guiTests.setValuesAndCreate(path, fieldsData, (data) => {
            env.objectId = data.id;
            pk_obj.api_pk = data.id
        }, true)


        /////////////////////////////////////////////
        // Test path /user/{pk}/settings/ (edit page)
        /////////////////////////////////////////////

        guiTests.openPage("/user/{pk}/settings/", env, (env) =>{
            return vstMakeLocalApiUrl("/user/{pk}/settings/", pk_obj);
        });

        guiTests.updateObject("/user/{pk}/settings/", {autoupdateInterval:{value:5000}}, true);

        // deletes remaining objects
        guiTests.deleteObjByPath("/user/{pk}/", env, pk_obj);
    }
};