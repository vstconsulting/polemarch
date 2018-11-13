
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
            $("body").append("<div id='guiElementsTestForm'></div>")


            formData = {
                title:"Deploy",
                form:[
                        {
                            name:'inventory',
                            title:'inventory',
                            default:'',
                            format:'hybrid_autocomplete',
                            dynamic_properties:{
                                list_obj: "/project/{pk}/inventory/",
                                value_field: "id",
                                view_field: "name",
                            }
                        },
                        {
                            name:'user',
                            title:'User',
                            description: "connect as this user (default=None)",
                            format:'string',
                            type: "string",
                        },
                        {
                            name:'key_file',
                            title:'Key file',
                            description: "use this file to authenticate the connection",
                            default:'',
                            format:'secretfile',
                            type: "string",
                            dynamic_properties:{
                                list_obj: "/project/{pk}/inventory/",
                                value_field: "id",
                                view_field: "name",
                            }
                        },
                        {
                            name:"extra_vars",
                            title:"Extra vars",
                            format:'form',
                            form:[
                                    {
                                        name:'varName',
                                        title:'Name',
                                        default:'Name',
                                        format:'string',
                                        help:'Name',
                                    },
                                    {
                                        name:'varTask',
                                        title:'Name',
                                        default:'Name',
                                        format:'enum',
                                        help:'Name',
                                        enum:['A', 'B', 'C'],
                                    },
                                    {
                                        name:'varVersion',
                                        title:'Name',
                                        default:'Name',
                                        format:'boolean',
                                        help:'Name',
                                    },
                                    {
                                        name:'RunBtn',
                                        title:'abc.yaml',
                                        value:'abc.yaml',
                                        format:'button',
                                        text:'Run abc.yaml',
                                        onclick:function(){
                                            alert("ABC");
                                        },
                                        class:'gui-test-form'
                                    },
                            ]
                        }
                ]
            }

            element = new guiElements.form(undefined, formData);

            $("#guiElementsTestForm").insertTpl(element.render())

            assert.ok(true, 'guiElements.form');

            $("#guiElementsTestForm").remove();
            testdone(done)
        });
    }
}
