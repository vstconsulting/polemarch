/**
 * Function tests import of inventory.
 * @param path {string} - path of object.
 * @param params {object} - object with properties for tests (fields data and test options).
 * @param env {object} - object with ids of parent and surrounding objects.
 * @param pk_obj {object} - object with ids values suitable for vstMakeLocalApiUrl function.
 */
guiTests.importInventory = function(path, params, env, pk_obj){

    guiTests.executeAction(path + "import_inventory/", {
        data:{
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
        }
    }, env, pk_obj);

    syncQUnit.addTest("guiPaths['" + path + "import_inventory/' save pk of imported inventory] ", function ( assert )
    {
        let done = assert.async();
        if(window.curentPageObject.model.data){
            env["imported_inventory_id"] = window.curentPageObject.getPkValueForUrl(window.curentPageObject.model.data);
            pk_obj["api_imported_inventory_id"] = env["imported_inventory_id"];
            assert.ok(true, "Id of imported object was saved");
        } else {
            assert.ok(false, "Id of imported object was not saved");
        }
        testdone(done);
    });

    ["group", "host"].forEach((obj) => {
        guiTests.openPage("/inventory/{imported_inventory_id}/" + obj + "/", env, (env) =>{
            return vstMakeLocalApiUrl("/inventory/{imported_inventory_id}/" + obj + "/", pk_obj)
        });

        syncQUnit.addTest("guiPaths['"+ path +"import_inventory/' save pk of imported " + obj + "] ", function ( assert )
        {
            let done = assert.async();
            if($(".item-row").length == 1){
                assert.ok(true, obj + " was imported");
                env["imported_" + obj + "_id"] = $($(".item-row")[0]).attr('data-id');
                pk_obj["api_imported_" + obj + "_id"] = env["imported_" + obj + "_id"];
                assert.ok(env["imported_" + obj + "_id"], "Id of imported " + obj + " was saved");
            } else {
                assert.ok(false, obj + " was not imported");
            }

            testdone(done);
        });

        if(params.page && params.page.delete) {
            [
                "inventory/{imported_inventory_id}/" + obj + "/{imported_" + obj + "_id}/",
                "/" + obj + "/{imported_" + obj + "_id}/"
            ].forEach((val) => {
                guiTests.deleteObjByPath(val, env, pk_obj);
            })
        }
    });

    if(params.page && params.page.delete){
        guiTests.deleteObjByPath(path + "{imported_inventory_id}/", env, pk_obj);
    };
};