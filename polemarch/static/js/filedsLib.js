
var filedsLib = {}
filedsLib.validator = {}

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
 * @type Object Объект наследник от pmItem
 * @type Object Объект c описанием поля
 * @type Integer Идентификатор редактируемого элемента
 * @type Object Дополнительные параметры
 */
filedsLib.filed.simpleText.render = function(pmObj, filed, item_id, opt){
    return spajs.just.render('filed_type_'+this.type, {pmObj:pmObj, filed:filed, item_id:item_id, opt:opt})
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
 * Для показа текста без его изменения
 * @type Object
 */
filedsLib.filed.disabled = inheritance(filedsLib.filed.simpleText)
filedsLib.filed.disabled.type = 'disabled'

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

filedsLib.filed.boolean.getValue = function(pmObj, filed){
    return $("#filed_"+filed.name).hasClass('selected');
}


/**
 * Для ввода текстового поля типа textarea
 * @type Object
 */
filedsLib.filed.textarea = inheritance(filedsLib.filed.simpleText)
filedsLib.filed.textarea.type = 'textarea'

filedsLib.filed.textarea.getValue = function(pmObj, filed){
    return $("#filed_"+filed.name).val();
}

filedsLib.validator.notEmpty = function(value, name)
{
    if(value != '' && value)
    { 
        return true;
    }
    
    $.notify("Invalid value in field `"+name+"` it mast be not empty", "error"); 
    return false; 
}