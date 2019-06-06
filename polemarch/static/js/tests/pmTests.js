/**
 * File with extension of GuiTest Class.
 */

/**
 * Class, that extends GuiTests Class - adds tests for Polemarch GUI.
 */
class PmGuiTests extends GuiTests {
    /**
     * Method, that creates test, that executes 'inventory_import' action from some list view.
     * This test opens list view, and then with the help of buttons executes 'inventory_import' action.
     * @param {string} path Path of list view, that has 'inventory_import' action.
     * @param {object} instances_info Object with 2 properties:
     * - {object} url_params Object with URL params for path;
     * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
     * @param {object} options Object with options for test. Includes:
     * - {boolean} remove If true - copied instance will be deleted.
     */
    importInventoryFromListView(path, instances_info, options) {
        options.action = 'import_inventory';
        options.is_valid = true;
        options.data = {
            name:{
                value: "test-imported-inventory",
            },
            raw_data: {
                value: "[test-imported-group]\n" +
                "test-imported-host ansible_host=10.10.10.10\n" +
                "\n" +
                "[test-imported-group:vars]\n" +
                "ansible_user=ubuntu\n" +
                "ansible_ssh_private_key_file=example-key",
            },
        };

        // executes 'inventory_import' action.
        this.executeActionFromSomeView(path, instances_info, options, (assert) => {
             this.saveInstanceData(instances_info, false, 'imported_');
        });

        // checks, that imported inventory's subitems(group, host) were imported properly.
        ['group', 'host'].forEach(entity => {
            // checks, that subitems were added.
            this.clickAndWaitRedirect(".btn-sublink-" + entity, true, (assert) => {
                assert.ok($('.item-row').length == 1, 'Import inventory - only one ' + entity + ' was added');
            });

            this.clickAndWaitRedirect(".item-row", true, (assert) => {
                this.saveInstanceData(instances_info, false, 'imported_');
            });

            // checks, that variables were added to subitems.
            this.clickAndWaitRedirect(".btn-sublink-variables", true, (assert) => {
                let num = entity == 'group' ? 2 : 1;
                assert.ok($('.item-row').length == num, 'Import inventory - valid variables amount was added to ' + entity);
            });

            // removes subitems.
            if(options.remove) {
                this.clickAndWaitRedirect(".btn-previous-page", true);

                this.clickAndWaitRedirect(".btn-operation-remove", true);

                this.testRemovePageViewInstance("/" + entity + "/{imported_" + entity + "_id}/", instances_info, true);
            }

            this.openPage(path + "{imported_inventory_id}/", instances_info.url_params, true);

        });

        // removes imported inventory.
        if(options.remove) {
            this.clickAndWaitRedirect(".btn-operation-remove", true);
        }
    }
    /**
     * Method, that creates test, that executes 'sync' action from project page view.
     * This test opens page view, and then with the help of buttons executes 'sync' action and waits end of sync.
     * @param {string} path Path of list view, that has 'inventory_import' action.
     * @param {object} instances_info Object with 2 properties:
     * - {object} url_params Object with URL params for path;
     * - {object} key_fields_data Object with view && values fields values of created during test Model instances.
     * @param {boolean} expectation If true - sync is expected to be successful.
     */
    testProjectSyncFromPageView(path, instances_info, expectation=true) {
        guiTests.openPage(path, instances_info.url_params, true);

        guiTests.click(".btn-action-sync");

        syncQUnit.addTest("wait project sync", function(assert) {
            let done = assert.async();

            let stillWait = () => {
                let url = app.application.$route.path.replace(/^\/|\/$/g, "");
                let data = app.application.$store.state.objects[url].cache.data;

                if(["NEW", "SYNC", "WAIT_SYNC"].includes(data.status)) {
                    return true;
                }

                return data.status;
            };

            let waitStatus = () => {
                setTimeout(() => {
                    let wait = stillWait();

                    if(typeof wait == 'boolean' && wait === true) {
                        waitStatus();
                    } else {
                        assert.ok((wait == 'OK') === expectation, 'Sync was successful');
                        testdone(done);
                    }

                }, guiLocalSettings.get('page_update_interval') / 2);
            };

            waitStatus();
        });
    }
}

/**
 * Redefines guiTests variable - variable, that is used for gui test generation.
 */
guiTests = new PmGuiTests();

