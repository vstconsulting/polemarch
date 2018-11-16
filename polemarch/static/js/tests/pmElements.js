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


window.qunitTestsArray['guiElements.ansible_json'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.ansible_json', function ( assert )
        {
            let done = assert.async();

            $("#guiElementsTestForm").remove();

            let moduleData =   {
                requirements:["botocore","boto3"],
                description:["Gather facts about availability zones in AWS."],
                author: "Henrique Rodrigues (github.com/Sodki)",
                module: "aws_az_facts",
                options: {
                    filters: {
                        default: null,
                        default2: {},
                        empty_string: "",
                        required:false,
                        description:["A dict of filters to apply. Each dict item consists of a filter key and a filter value."],
                    }
                },
                version_added:"2.5",
                short_description:"Gather facts about availability zones in AWS.",
                extends_documentation_fragment:["aws","ec2"],
                notes: [],
            }

            let sorted_value_keys = ["short_description", "description", "module", "version_added", "requirements", "extends_documentation_fragment", "options", "notes","author"];
            let realElements_types = {
                short_description: "text_paragraph",
                description: "text_paragraph",
                module: "string",
                version_added: "string",
                requirements: "textarea",
                extends_documentation_fragment: "textarea",
                options: "ansible_json",
                notes: "hidden",
                author: "string",
            }

            let options_filters_fields_types = {
                default: "null",
                default2: "hidden",
                empty_string: "hidden",
                required: "boolean",
                description: "text_paragraph",
            }

            let element = new guiElements.ansible_json(undefined, moduleData);
            let sorted_value = element.sortValue(moduleData);
            let realEleemnts = element.getRealElements(sorted_value, {})


            assert.equal(sorted_value_keys.length, Object.keys(sorted_value).length)
            assert.ok(deepEqual(sorted_value_keys, Object.keys(sorted_value)))

            for(let field in realElements_types)
            {
                assert.equal(realElements_types[field], realEleemnts[field].name);
            }

            let options_filters = realEleemnts["options"].realElements["filters"];

            assert.equal(options_filters.name, "ansible_json")

            for(let field in options_filters_fields_types)
            {
                assert.equal(options_filters_fields_types[field], options_filters.realElements[field].name);
            }

            testdone(done)
        });
    }
}
