
window.qunitTestsArray['guiPaths.project'] = {
    test:function()
    {
        let path = '/project/'
        let test_name = '/project/'
        let env = {}

        guiTests.openPage(path)

        // Проверка наличия элемента на странице
        guiTests.hasCreateButton(1, path)

        // Проверка возможности создания объекта
        guiTests.openPage(path+"new")


        let project = {
            type:{
                value: "MANUAL",
                do_not_compare:true
            },
            name:{
                value: "test-"+rundomString(6),
            }
        }

        guiTests.setValuesAndCreate(test_name, project, (data) => {
            env.objectId = data.id;
        }, true)

        guiTests.hasDeleteButton(true, test_name)
        guiTests.hasCreateButton(false, test_name)
        guiTests.hasAddButton(false, test_name)


        guiTests.updateObject(test_name, {notes:{value:rundomString(6)}}, true)

        guiTests.openPage(test_name, env, (env) =>{ return vstMakeLocalApiUrl("project/{pk}/template/new", {api_pk:env.objectId}) })

        // Проверка того что страница с флагом api_obj.canCreate == true открывается
        syncQUnit.addTest("guiPaths['project/{pk}/template/new'] create new template", function ( assert )
        {
            let done = assert.async();

            let fieldsData = {
                name:{value:rundomString(6)}
            }

            // @todo добавить проверку того что поля правильно меняются от значений других полей

            let values = guiTests.setValues(assert, fieldsData)

            // Создали объект с набором случайных данных
            $.when(window.curentPageObject.createAndGoEdit()).done(() => {

                guiTests.compareValues(assert, test_name, fieldsData, values)

                env.template_id = window.curentPageObject.model.data.id;

                assert.ok(true, 'guiPaths["project/{pk}/template/new"] create new template ok');

                // @todo добавить проверку того что поля правильно меняются от значений других полей

                testdone(done)
            }).fail((err) => {
                assert.ok(false, 'guiPaths["'+test_name+'new"] create new template fail');
                testdone(done)
            })
        })

        test_name = "project/{pk}/template/{template_id}"
        guiTests.openPage(test_name, env, (env) =>{ return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/", {api_pk:env.objectId, api_template_id:env.template_id}) })


        test_name = "project/{pk}/template/{template_id}/option"
        guiTests.openPage(test_name, env, (env) =>{ return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/", {api_pk:env.objectId, api_template_id:env.template_id}) })
        guiTests.hasCreateButton(true, test_name)
        guiTests.hasAddButton(false, test_name)

        test_name = "project/{pk}/template/{template_id}/option/new"
        guiTests.openPage(test_name, env, (env) =>{ return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/new", {api_pk:env.objectId, api_template_id:env.template_id}) })


        let option_data = {
            module:{value:"shell"},
            args:{value:"uptime1"},
            group:{value:"all"},
            name:{value:"testUptime"},
        }

        guiTests.setValuesAndCreate(test_name, option_data, (data) =>{}, true)

        test_name = "project/{pk}/template/{template_id}/option/@testUptime"
        guiTests.updateObject("project/{pk}/template/{template_id}/option/@testUptime", {args:{value:"uptime"}}, true);


        test_name = "project/{pk}/template/{template_id}/option/@testUptime/variables"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/@testUptime/variables", {api_pk:env.objectId, api_template_id:env.template_id})
        })
        guiTests.hasCreateButton(true, test_name)
        guiTests.hasAddButton(false, test_name)

        test_name = "project/{pk}/template/{template_id}/option/@testUptime/variables/new"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/@testUptime/variables/new", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        let variables_data = {
            key:{value:"timeout"},
            value:{value:"30"},
        }

        guiTests.setValuesAndCreate(test_name, variables_data, (data) =>{  }, true)

        guiTests.deleteObject(test_name)

        test_name = "project/{pk}/template/{template_id}/option/@testUptime/variables"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/@testUptime/variables", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        test_name = "project/{pk}/template/{template_id}/option/@testUptime"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option/@testUptime", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        guiTests.deleteObject(test_name)

        test_name = "project/{pk}/template/{template_id}/option"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}/option", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        test_name = "project/{pk}/template/{template_id}"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}/template/{template_id}", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        guiTests.deleteObject(test_name)

        test_name = "project/{pk}"
        guiTests.openPage(test_name, env, (env) =>{
            return vstMakeLocalApiUrl("project/{pk}", {api_pk:env.objectId, api_template_id:env.template_id})
        })

        guiTests.deleteObject(test_name)
    }
}



window.qunitTestsArray['guiElements.form'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.form', function ( assert )
        {
            let element;
            let formData;
            let done = assert.async();

            $("#guiElementsTestForm").remove();
            $("body").append("<div id='guiElementsTestForm'></div>")


            formData = {
                title:"Deploy",
                form:{
                    'inventory' : {
                        title:'inventory',
                        required:true,
                        format:'hybrid_autocomplete',
                        dynamic_properties:{
                            list_obj: "/project/{pk}/inventory/",
                            value_field: "id",
                            view_field: "name",
                        }
                    },
                    user:{
                        title:'User',
                        description: "connect as this user (default=None)",
                        format:'string',
                        type: "string",
                    },
                    key_file: {
                        title:'Key file',
                        description: "use this file to authenticate the connection",
                        format:'secretfile',
                        type: "string",
                        dynamic_properties:{
                            list_obj: "/project/{pk}/inventory/",
                            value_field: "id",
                            view_field: "name",
                        }
                    },
                    extra_vars: {
                        title:"Execute parametrs",
                        format:'form',
                        form:{
                            varName: {
                                name:'varName',
                                title:'Name',
                                default:'NameDefaultValue',
                                format:'string',
                                help:'Name',
                            },
                            varTask: {
                                name:'varTask',
                                title:'Name',
                                default:'B',
                                format:'enum',
                                help:'Name',
                                enum:['A', 'B', 'C'],
                            },
                            varVersion: {
                                name:'varVersion',
                                title:'Name',
                                default:true,
                                format:'boolean',
                                help:'Name',
                            },
                            RunBtn: {
                                name:'RunBtn',
                                title:'abc_yml',
                                value:'abc.yml',
                                format:'button',
                                text:'Run abc.yml',
                                onclick:function(){

                                    let val = element.getValue()
                                    val.playbook = this.getValue()

                                    assert.ok(val.extra_vars['RunBtn'] == 'abc.yml', 'guiElements.form test RunBtn');
                                    assert.ok(val.playbook == 'abc.yml', 'guiElements.form test playbook');

                                    assert.ok(val.extra_vars['varName'] == 'NameDefaultValue', 'guiElements.form test varName');

                                    assert.ok(val.extra_vars['varVersion'] == true, 'guiElements.form test values');

                                    testdone(done)
                                },
                                class:'gui-test-form'
                            },
                        }
                    }
                }
            }

            element = new guiElements.form(undefined, formData);
            $("#guiElementsTestForm").insertTpl(element.render())

            setTimeout(() => {
                $("#guiElementsTestForm .btn_abc_yml").trigger('click')
            }, 50)
        });
    }
}
