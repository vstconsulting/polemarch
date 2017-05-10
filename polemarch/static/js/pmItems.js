
function pmItems()
{
    this.validateHostName = function(name)
    {
        var regexp = {
            ipTest : /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
            ip6Test : /((^|:)([0-9a-fA-F]{0,4})){1,8}$/,
            domenTest : /^((\.{0,1}[a-z0-9][a-z0-9-]{0,62}[a-z0-9]\.{0,1})*)$/
        }

        if(regexp.ipTest.test(name))
        {
            return true;
        }

        if(regexp.ip6Test.test(name))
        {
            return true;
        }

        if(regexp.domenTest.test(name))
        {
            return true;
        }

        return false; 
    }

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

