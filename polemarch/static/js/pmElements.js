
guiElements.ansible_json = function(opt = {}, value)
{
    this.name = 'ansible_json'
    guiElements.base.apply(this, arguments)

    this.realElements = {};

    this.sortValue = function (value)
    {
        let sorted_value = {};
        let ordered_props = ['short_description', 'description', 'module', 'version_added', 'required', 'requirements', 'extends_documentation_fragment', 'options', 'notes', 'author'];

        // adding to sorted_value fields from ordered_props in correct order
        for(let i in ordered_props)
        {
            let field = ordered_props[i];
            if(value[field] !== undefined)
            {
                sorted_value[field] = value[field];
            }
        }

        // adding others field, that are not from ordered_props
        for(let field in value)
        {
            if($.inArray(field, ordered_props) == -1)
            {
                sorted_value[field] = value[field];
            }
        }

        return sorted_value;
    }

    /**
     * Function sets correct types to fields of ansible_json value
     * @param value(object) - ansible_json value
     */
    this.getRealElements = function(value)
    {
        let realElements = {};

        let fields_types = {
            short_description: 'text_paragraph',
            description: 'text_paragraph',
            notes: 'text_paragraph',
        }

        let options_field_title = "Options:";
        let options_child_fields_subtitle = "Option: ";

        for (let field in value)
        {
            let options = {
                readOnly: opt.readOnly || false,
                title: capitalizeString(field.replace(/_/g, " ")),
            }

            let type = 'string';
            if (fields_types[field] && opt.title != options_field_title)
            {
                type = fields_types[field];

                if (opt.title && opt.title.search(options_child_fields_subtitle) != -1)
                {
                    options.hide_title = true;
                }
            }
            else if (typeof value[field] == "string" && value[field].length > 50)
            {
                type = 'textarea';
            }
            else if (typeof value[field] == 'boolean')
            {
                type = 'boolean';
            }
            else if (typeof value[field] == 'object')
            {
                if (Array.isArray(value[field]))
                {
                    type = 'textarea';
                }
                else if (value[field] === null)
                {
                    type = 'null';
                }
                else
                {
                    type = 'ansible_json';
                    if (allPropertiesIsObjects(value[field]))
                    {
                        options.divider = true;
                        options.title += ":";
                    }
                    else
                    {
                        if (opt.title == options_field_title)
                        {
                            options.title = options_child_fields_subtitle + field;
                        }
                    }
                }
            }

            if ((typeof value[field] == "string" && value[field] == "") ||
                (Array.isArray(value[field]) && value[field].length == 0) ||
                (typeof value[field] == "object" && value[field] !== null && Array.isArray(value[field]) == false && Object.keys(value[field]).length == 0))
            {
                type = 'hidden';
            }

            realElements[field] = new guiElements[type]($.extend({}, options), value[field]);
        }

        return realElements;
    }

    this.setValue = function(value)
    {
        this.value = value
        let realElements = {}
        if(value)
        {
            value = this.sortValue(value);
            realElements = this.getRealElements(value);
        }

        this.realElements = realElements;
    }

    this.setValue(value)

    this.insertTestValue = function(value)
    {
        this.setValue(value);
        return value;
    }

    this.getValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValue();
        }

        return this.reductionToType(valueObj);
    }

    this.getValidValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValidValue();
        }

        return valueObj;
    }
}