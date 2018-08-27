guiElements.inventoryNameById = function(item_id)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "");
    this.render = function(render_options = {})
    {
        let inventory = new apiinventory.one()
        $.when(inventory.load(item_id)).done(() =>
        {
             $("#holder_" + this.element_id).insertTpl(spajs.just.render('entity_one_as_filed', {guiObj: inventory, opt: {}}));
             $($("#holder_" + this.element_id).children('div')[0]).removeClass('col-lg-4  col-sm-6 col-md-6');
             $($("#holder_" + this.element_id).children('div')[0]).addClass('col-lg-12  col-sm-12 col-md-12');
        }).fail(function (e)
        {

        });

        return '<div id="holder_'+this.element_id+'" ></div>';

    }

}