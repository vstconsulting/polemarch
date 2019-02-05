
window.qunitTestsArray['guiPaths.profile/settings'] = {
    test:function()
    {
        let path = "profile/settings";
        guiTests.openPage(path);
        guiTests.hasElement(1, ".btn_save", path);
        guiTests.hasEditButton(false);
        guiTests.hasAddButton(0, path);
        guiTests.hasElement(1, ".gui-field-chartLineSettings", path);
        guiTests.hasAddButton(0, path);
        $(".btn_save").trigger('click');
    }
};

window.qunitTestsArray['guiPaths.user.user_settings'] = {
    test:function()
    {
        let env = {};
        let pk_obj = {};

        // creates user for testing user settings
        guiTests.createUser(env, pk_obj, true);

        /////////////////////////////////////////////
        // Test path /user/{pk}/settings/ (edit page)
        /////////////////////////////////////////////

        guiTests.openPage("/user/{pk}/settings/", env, (env) =>{
            return vstMakeLocalApiUrl("/user/{pk}/settings/", pk_obj);
        });

        guiTests.updateObject("/user/{pk}/settings/", {autoupdateInterval:{value:5}}, true);

        // deletes remaining objects
        guiTests.deleteObjByPath("/user/{pk}/", env, pk_obj);
    }
};