
function pmItems()
{
    this.showList = function(holder, menuInfo, data){}

    this.showItem = function(holder, menuInfo, data){}
 
    this.showNewItemPage = function(holder, menuInfo, data){}
 
    /**
     * Обновляет поле модел polemarch.model.hostslist и ложит туда список пользователей
     * Обновляет поле модел polemarch.model.hosts и ложит туда список инфу о пользователях по их id
     */
    this.loadAllItems = function(){}
 
    /**
     * Обновляет поле модел polemarch.model.hosts[item_id] и ложит туда пользователя
     */
    this.loadItem = function(item_id){}
 
    /**
     * @return $.Deferred
     */
    this.addItem = function(){}
 
    /**
     * @return $.Deferred
     */
    this.updateItem = function(item_id){}
  
    /**
     * @return $.Deferred
     */
    this.deleteItem = function(item_id){}
 
}

