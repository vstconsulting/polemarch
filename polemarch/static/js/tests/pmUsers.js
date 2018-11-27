
window.qunitTestsArray['guiPaths.profile/settings'] = {
    test:function()
    {
        let path = "profile/settings"
        guiTests.openPage(path)
        guiTests.hasElement(0, ".btn_save", path)
        guiTests.hasEditButton(true)
        guiTests.hasAddButton(0, path)


        path = "profile/settings/edit"
        guiTests.openPage(path)

        guiTests.hasElement(1, ".btn_save", path)
        guiTests.hasElement(1, ".gui-field-chartLineSettings", path)

        guiTests.hasAddButton(0, path)

        $(".btn_save").trigger('click')

    }
}