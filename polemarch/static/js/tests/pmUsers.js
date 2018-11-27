
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
}