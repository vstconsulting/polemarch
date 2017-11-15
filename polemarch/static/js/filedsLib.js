
var filedsLib = {}

filedsLib.returnString = function(str){
    return function(){
        return str;
    }
}

filedsLib.getFunctionValue = function(obj)
{
    if(typeof obj == "function")
    {
        return obj();
    }

    return obj;
}


/**
 * Функции для рендера полей
 * @type Object
 */
filedsLib.filed = function(){}


/**
 * Для вывода текстового поля
 * @type Object
 */
filedsLib.filed.simpleText = function(){}
filedsLib.filed.simpleText.type = "text";

/**
 * Функция для рендера текстового поля
 * @type Object
 */
filedsLib.filed.simpleText.render = function(pmObj, filed, item_id){

    return spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id})
}

filedsLib.filed.simpleText.getValue = function(pmObj, filed){
    return $("#filed_"+filed.name).val();
}

/**
 * Для ввода текста
 * @type Object
 */
filedsLib.filed.text = inheritance(filedsLib.filed.simpleText)
filedsLib.filed.text.type = 'text'

/**
 * Для ввода пароля
 * @type Object
 */
filedsLib.filed.password = inheritance(filedsLib.filed.simpleText)
filedsLib.filed.password.type = 'password'

/**
 * Для ввода пароля
 * @type Object
 */
filedsLib.filed.boolean = inheritance(filedsLib.filed.simpleText)
filedsLib.filed.boolean.type = 'boolean'
