
/*
 * Function for getting value from inventory hybrid_autocomplete.
 */
function inventory_hybrid_autocomplete_getValue()
{
    let prefix = './';
    let view_field_value = $("#" + this.element_id).val();
    let value_field_value = $("#" + this.element_id).attr('value');

    if(value_field_value)
    {
        return value_field_value;
    }

    if(view_field_value[view_field_value.length-1] == ",")
    {
        return view_field_value;
    }
    else if(view_field_value.substr(0,2) == prefix)
    {
        return view_field_value;
    }

    return prefix + view_field_value;
}

function InventoryVariable_value_callback(fieldObj, newValue)
{
    if(newValue.value == 'ansible_port')
    {
        fieldObj.opt.min = 1
        fieldObj.opt.max = 65535
    }
    else
    {
        delete fieldObj.opt.min
        delete fieldObj.opt.max
    }
}

tabSignal.connect("openapi.schema.definition.InventoryVariable", function (obj) {
    let props = obj.definition.properties;
    props['value'].dynamic_properties = {
        __func__callback: 'InventoryVariable_value_callback',
    }
})

tabSignal.connect("openapi.schema.definition.InventoryImport", function (obj) {
    let props = obj.definition.properties;
    props['inventory_id'].hidden = true;

    props['raw_data'].format = 'file';
    props['raw_data'].title = 'Inventory file';

})