/**
 * @link https://github.com/Levhav/TabSignal.js
 */

function tabSignal()
{
    return tabSignal;
}

tabSignal.slotArray = new Array();
tabSignal.debug = false;

tabSignal.sigId = 0;

tabSignal.tabUUID = undefined;
tabSignal.getTabUUID = function()
{
    if(!tabSignal.tabUUID)
    {
        tabSignal.tabUUID = "";
        for(var i = 0; i< 16; i++)
        {
            tabSignal.tabUUID += "qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM"[Math.floor(Math.random()*62)];
        }
    }
    return tabSignal.tabUUID;
}

/**
 * Подписывает слот на сигнал
 *
 * Если передать два параметра то они обработаются как  connect( signal_name, slot_function )
 * Если передать три параметра то они обработаются как  connect( slot_name, signal_name, slot_function )
 *
 * @param slot_name Имя слота
 * @param signal_name Имя сигнала
 * @param slot_function Функция вызваемая при вызове слота, должна иметь следующию сигнатуру function(param, signal_name){}
 *
 * <code>
 * Пример использования
 * new new signal().emit("catalogControl.OpenObject",{})
 *
 * </code>
 */
tabSignal.connect = function(slot_name, signal_name, slot_function)
{
    if(slot_function === undefined)
    {
        slot_function = signal_name;
        signal_name = slot_name;
        slot_name = "sig" + (tabSignal.sigId++)
    }

    if (tabSignal.slotArray[signal_name] === undefined)
    {
        tabSignal.slotArray[signal_name] = {}
    }
    tabSignal.slotArray[signal_name][slot_name] = slot_function;
    if(tabSignal.debug) console.log("На прослушивание сигнала " + signal_name + " добавлен слот " + slot_name + "", tabSignal.slotArray)
    return slot_name;
}


/**
 * Отписывает слот slot_name от сигнала signal_name
 */
tabSignal.disconnect = function(slot_name, signal_name)
{
    if (tabSignal.slotArray[signal_name] !== undefined)
    {
        if (tabSignal.slotArray[signal_name][slot_name] !== undefined)
        {
            tabSignal.slotArray[signal_name][slot_name] = undefined;
            return true
        }
    }
    return false
}

/**
 * Вызывает слоты подписаные на сигнал signal_name и каждому из них передаёт аруметы signal_name - имя вызвавшего сигнала, и param - объект с параметрами для слота)
 * В добавок ретранслирует сигнал в дочернии iframe если они есть и в родительское окно если оно есть
 * @param signal_name Имя сигнала
 * @param param Параметры переданые слоту при вызове в втором аргументе
 * @param SignalNotFromThisTab Если false то значит это сигнал пришёл из другой вкладки
 */
tabSignal.emit = function(signal_name, param, SignalNotFromThisTab)
{
    if (tabSignal.slotArray[signal_name] === undefined)
    {
        if(tabSignal.debug) console.log("На сигнал " + signal_name + " нет подписчиков")
    }
    else
    {
        if(tabSignal.debug) console.log("Сигнал " + signal_name + " подписаны слоты")
        var obj = tabSignal.slotArray[signal_name];
        for (var slot in obj)
        {
            if( obj.hasOwnProperty(slot) &&  obj[slot] !== undefined)
            {
                obj[slot](param,signal_name, SignalNotFromThisTab === true)
            }
        }

    }
}

/*
 *  генерация события будут оповещены и соседние вкладки
 *  @eName string - имя события
 *  использование .emit('любое название события', [ Параметры события ])
 */
tabSignal.emitAll = function (signal_name, param)
{
    tabSignal.emit(signal_name, param)

    try{
        if(window['localStorage'] !==undefined  )
        {
            var curent_custom_id = Math.random()+"_"+Math.random()+"_"+Math.random()+"_"+Math.random()+"_"+Math.random()
            window['localStorage']['tabSignal_storage_emit']= JSON.stringify({name:signal_name, custom_id:curent_custom_id, param:param});
        }
        return true
    }catch (e){
        return false
    }
}

/**
 * Запись состояния общего для всех вкладок
 * @param {string} name
 * @param {object} value
 * @param {number} minTime минимальный возраст данных меньше которого данные перезаписватся не должны в том случаии если они записанны не этой вкладкой
 */
tabSignal.setState = function(name, value, minTime)
{
    console.log("setState", name, value, minTime)
    var time = new Date()
    try{
        if(minTime)
        {
            var value = window.localStorage["tabSignal_"+name];
            if(value)
            {
                var val = JSON.parse(value)

                if(val.time + minTime > time.getTime() && val.tabUUID != tabSignal.getTabUUID() )
                {
                    // Возраст данных меньше minTime и они записаны не этой вкладкой, а значит мы их перезаписывать не будем
                    return false
                }
            }
        }

        window.localStorage["tabSignal_"+name] = JSON.stringify({time: time.getTime(), value: value, tabUUID: tabSignal.getTabUUID()})
        return true
    }catch (e){
        return false
    }
}

/**
 * Обновление с интервалом данных чтоб их не перезаписала другая вкладка
 * @param {type} name
 * @param {type} value
 * @param {type} minTime
 * @returns {undefined}
 */
tabSignal.intervalUpdateState = function(name, value, minTime)
{
    if(tabSignal.setState(name, value, minTime))
    {
        return setInterval(tabSignal.setState, minTime/3, name, value, minTime)
    }
    return undefined
}
/**
 * Чтение состояния общего для всех вкладок
 * @param {string} name
 * @param {number} maxTime Максимальный возраст данных в милесекундах после чего они считаются не действительными.
 * @returns {Window.localStorage}
 */
tabSignal.getState = function(name, maxTime)
{
    try{
        var time = new Date()
        var value = window.localStorage["tabSignal_"+name];
        if(value)
        {
            var val = JSON.parse(value)

            if(!maxTime)
            {
                // Нам не важен возраст данных
                return val.value
            }

            if(val.time + maxTime > time.getTime())
            {
                // Возраст данных меньше maxTime
                return val.value
            }
            return undefined
        }
    }catch (e){ }
    return undefined
}

tabSignal.send_emit = tabSignal.emitAll; // Для совместимости с прошлой версией.


if(!tabSignal.init)
{
    tabSignal.init = true
    if( window.addEventListener )
    {
        window.addEventListener('storage', function(e)
        {
            if(e.key && e.key == 'tabSignal_storage_emit')
            {// !testThis
                try{
                    var data = JSON.parse(e.newValue);
                    if(data !== undefined && data.name !== undefined  )
                    {
                        if(tabSignal.debug > 1) console.log( data )
                        tabSignal.emit( data.name, data.param, true )
                    }
                }
                catch (failed)
                {
                }
            }
        }, false);
    }
    else
    {
        document.attachEvent('onstorage', function(e)
        {
            if(e.key && e.key == 'tabSignal_storage_emit')
            {// !testThis
                try{
                    var data = JSON.parse(e.newValue);
                    if(data !== undefined && data.name !== undefined  )
                    {
                        if(tabSignal.debug > 1) console.log( data )
                        tabSignal.emit( data.name, data.param, true )
                    }
                }
                catch (failed)
                {
                }
            }
        } );
    }
}
