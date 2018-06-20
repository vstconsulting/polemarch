/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */

///////////////////////////////////////////////
// Вспомагательные функции для тестирования
///////////////////////////////////////////////

/**
 *
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 *
 **/

var Base64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    }

}

/**
 * https://stackoverflow.com/a/25456134/7835270
 * @param {type} x
 * @param {type} y
 * @returns {Boolean}
 */
var deepEqual = function (x, y)
{
    if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null))
    {
        if (Object.keys(x).length != Object.keys(y).length)
        {
            console.error("x.keys.length != y.keys.length")
            throw("x.keys.length != y.keys.length")
            return false;
        }

        for (var prop in x)
        {
            if (y.hasOwnProperty(prop))
            {
                if (! deepEqual(x[prop], y[prop]))
                {
                    console.error("x["+prop + "] != y["+prop+"]")
                    throw("x["+prop + "] != y["+prop+"]")
                    return false;
                }
            }
            else
            {
                console.error("x["+prop + "] != undefined")
                throw("x["+prop + "] != undefined")
                return false;
            }
        }

        return true;
    }
    else if (x !== y)
    {
        console.error("x("+x + ") != y("+ y + ")")
        throw("x("+x + ") != y("+ y + ")")
        return false;
    }
    else
    {
        return true;
    }
}


function render(name, callback)
{
    if(callback === undefined)
    {
        callback =  name
        name = "render"
    }

    var def = new $.Deferred();
    var time = 4

    setTimeout(function(name){
        setTimeout(function(){

            if(callback)
            {
                callback(name)
            }

            def.resolve()
        }, time)
    }, time, name, 0)

    return def.promise();
}

function saveReport()
{
    $("body").html('<div id="qunit">'+$("#qunit").html()+'</div>');
    $("body").append('<link rel="stylesheet" href="' + hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">')
    console.log("saveReport")
}

/**
 * В этом массиве должны быть qunit тесты для приложения
 */
window.qunitTestsArray = []

/**
 * Вставляет Qunit и запускает выполнение тестов.
 */
function injectQunit()
{
    $("body").append('<link rel="stylesheet" href="' + hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">')
    $("body").append('<script src="'+ hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.js"></script>')
    $("body").append('<div id="qunit"></div><div id="qunit-fixture"></div>')

    var intervalId = setInterval(function()
    {
        if(!window.QUnit)
        {
            return;
        }

        console.log("Начинаем тесты от Qunit");
        clearInterval(intervalId)

        //QUnit.config.autostart = false
        //QUnit.config.reorder = false

        QUnit.done(function( details ) {
            console.log( "Total: "+ details.total+ " Failed: "+ details.failed+ " Passed: "+ details.passed+ " Runtime: "+ details.runtime );
        });

        QUnit.testDone(function(details){
            var result = {
                "Module name": details.module,
                "Test name": details.name,
                "Assertions": {
                    "Total": details.total,
                    "Passed": details.passed,
                    "Failed": details.failed
                },
                "Skipped": details.skipped,
                "Runtime": details.runtime
            };

            if(!syncQUnit.nextTest())
            {
                saveReport()
                render("ok-done", window.close)
            }
        })

        for(var i in window.qunitTestsArray)
        {
            window.qunitTestsArray[i].test.call()
        }
        syncQUnit.nextTest()

    }, 1000)
}


///////////////////////////////////////////////
// Дополнения для QUnit для последовательного выполнения тестов.
///////////////////////////////////////////////
syncQUnit = {}
syncQUnit.testsArray = []
syncQUnit.addTest = function(name, test)
{
    syncQUnit.testsArray.push({name:name, test:test})
}

syncQUnit.nextTest = function(name, test)
{
    if(!syncQUnit.testsArray.length)
    {
        return false;
    }

    var test = syncQUnit.testsArray.shift()

    $.notify("Test "+test.name+", "+syncQUnit.testsArray.length+" tests remain", "warn");

    QUnit.test(test.name, test.test);
    //syncQUnit.nextTest()
    //QUnit.start()
    return true;
}

///////////////////////////////////////////////
// Функции тестирования
///////////////////////////////////////////////

/**
 * qunitAddTests_trim
 */
window.qunitTestsArray.push({
    step:100,
    test:function()
    {
        syncQUnit.addTest('trim', function ( assert ) {
            var done = assert.async();
            assert.equal(trim(''), '', 'Пустая строка');
            assert.ok(trim('   ') === '', 'Строка из пробельных символов');
            assert.equal(trim(), '', 'Без параметра');

            assert.equal(trim(' x'), 'x', 'Начальные пробелы');
            assert.equal(trim('x '), 'x', 'Концевые пробелы');
            assert.equal(trim(' x '), 'x', 'Пробелы с обоих концов');
            assert.equal(trim('    x  '), 'x', 'Табы');
            assert.equal(trim('    x   y  '), 'x   y', 'Табы и пробелы внутри строки не трогаем');

            render(done);
        });

        syncQUnit.addTest('trim', function ( assert ) {
            var done = assert.async();

            var stringArr = [
                "abc",
                "A \" A",
                "A ' \\ \\\\ \t \\ \ g \" ' \' ",
                '"',
                'a"b\' g \" \t \ \\ \\\ c',
                ' \' \\ " \t \r  \b \e \c \d \n' ,
            ];
            for(var i in stringArr)
            {
                assert.equal(stripslashes(addslashes(stringArr[i])), stringArr[i], "i:"+stringArr[i]);
            }
            render(done);
        });
    }})

/**
 * Тестирование crontabEditor
 */
window.qunitTestsArray.push({
    step:1400,
    test:function()
    {
        syncQUnit.addTest('crontabEditor', function ( assert )
        {
            var done = assert.async();

            var cronString = "1 * * * *"

            crontabEditor.parseCronString(undefined)
            assert.ok(cronString != crontabEditor.getCronString(), 'getCronString');

            crontabEditor.parseCronString("1 5")
            assert.ok(cronString != crontabEditor.getCronString(), 'getCronString');

            crontabEditor.parseCronString(cronString)
            assert.ok(cronString == crontabEditor.getCronString(), 'getCronString');

            cronString = "1 1 1 1 1"
            crontabEditor.parseCronString(cronString)
            assert.ok("1 1 1 1 1" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setDaysOfWeek("1-2")
            assert.ok("1 1 1 1 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMonths("1-2")
            assert.ok("1 1 1 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setDayOfMonth("1-2")
            assert.ok("1 1 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setHours("1-2")
            assert.ok("1 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1-2")
            assert.ok("1,2 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,7")
            assert.ok("1,2,7 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,*/7")
            assert.ok("*/7,1,2 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,*/7")
            assert.ok("*/7,1-4 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,*/7,45-51")
            assert.ok("*/7,1-4,45-48,50,51 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,*/7,45-51,17-30/2")
            assert.ok("*/7,*/23,*/25,1-4,17,19,27,29,45,47,48,51 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,*/7,45-51,17-380/2")
            assert.ok("0-4,7,14,17,19,21,23,25,27-29,31,33,35,37,39,41-43,45-51,53,55-57,59 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,*/7,45-51,170-38/2")
            assert.ok("*/7,*/12,*/16,1-4,6,8,10,18,20,22,26,30,34,38,45-47,50,51 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            crontabEditor.setMinutes("1,2,3,4,5/5,45-51,170-38/2")
            assert.ok("*/5,*/12,*/16,1-4,6,8,14,18,22,26,28,34,38,46,47,49,51 1,2 1,2 1,2 1,2" == crontabEditor.getCronString(), 'getCronString');

            render(done)
        });
    }})

/**
 * Тестирование users
 */
window.qunitTestsArray.push({
    step:200,
    test:function()
    {
        syncQUnit.addTest('Открытие списка пользователей', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"users"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню users');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню users');
                render(done)
            })
        });

        syncQUnit.addTest('Страница списка пользователей toggleSelectEachItem', function ( assert )
        {
            var done = assert.async();

            pmUsers.toggleSelectAll($('.multiple-select tr'), true);

            $.when(pmUsers.toggleSelectEachItem(true)).done(function()
            {
                assert.ok(true, 'ok:toggleSelectEachItem');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:toggleSelectEachItem');
                render(done)
            })
        })

        syncQUnit.addTest('Открытие страницы добавления пользователя', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-user
            $.when(spajs.open({ menuId:"new-user"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-user');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-user');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Создание пользователя с ошибкой 1', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания пользователя
            var done = assert.async();

            // Заполнение формы с данными пользователя
            $("#filed_username").val("admin");
            $("#filed_password").val("admin");
            $("#filed_email").val("admin");
            $("#filed_first_name").val("admin");
            $("#filed_last_name").val("admin");

            // Отправка формы с данными пользователя
            $.when(pmUsers.addItem()).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно user add Item, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при user add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Создание пользователя с ошибкой 2', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания пользователя
            var done = assert.async();

            // Заполнение формы с данными пользователя
            $("#filed_username").val("admin"+t);
            $("#filed_password").val("admin");
            $("#filed_email").val("admin");
            $("#filed_first_name").val("admin");
            $("#filed_last_name").val("admin");

            // Отправка формы с данными пользователя
            $.when(pmUsers.addItem()).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно user add Item, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при user add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Создание пользователя', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания пользователя
            var done = assert.async();

            // Заполнение формы с данными пользователя
            $("#filed_username").val("test-user-"+t);
            $("#filed_password").val("test-user-"+t);
            $("#filed_confirm_password").val("test-user-"+t);
            $("#filed_email").val("test2@user.ru");
            $("#filed_first_name").val("test");
            $("#filed_last_name").val("user");

            // Отправка формы с данными пользователя
            $.when(pmUsers.addItem()).done(function()
            {
                assert.ok(true, 'Успешно user add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при user add Item');
                render(done)
            })
        });

        var userId = undefined
        syncQUnit.addTest('Изменение пользователя с ошибкой', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            userId = /user\/([0-9]+)/.exec(window.location.href)[1]

            $("#filed_username").val("admin");
            $("#filed_email").val("test2@user.ru");
            $("#filed_first_name").val("test2-"+t);
            $("#filed_last_name").val("user2-"+t);

            $.when(pmUsers.updateItem(userId)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно update add Item, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при update add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение пользователя', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            userId = /user\/([0-9]+)/.exec(window.location.href)[1]

            $("#filed_username").val("test2-user-"+t);
            $("#filed_email").val("test2@user.ru");
            $("#filed_first_name").val("test2-"+t);
            $("#filed_last_name").val("user2-"+t);

            $.when(pmUsers.updateItem(userId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        /*
    syncQUnit.addTest('Копирование пользователя с ошибкой', function ( assert )
    {
        var done = assert.async();
        $.when(pmUsers.copyAndEdit(999999)).done(function()
        {
            debugger;
            assert.ok(false, 'Успешно copyAndEdit add Item, а не должно было');
            render(done)
        }).fail(function(){
            assert.ok(true, 'Ошибка при copyAndEdit add Item, как и задумано');
            render(done)
        })
    });

    syncQUnit.addTest('Копирование пользователя', function ( assert )
    {
        var done = assert.async();

        $.when(pmUsers.copyAndEdit(userId)).done(function()
        {
            assert.ok(true, 'Успешно copyAndEdit add Item');
            render(done)
        }).fail(function()
        {
            debugger;
            assert.ok(false, 'Ошибка при copyAndEdit add Item');
            render(done)
        })
    });

    syncQUnit.addTest('Удаление копии пользователя с ошибкой', function ( assert )
    {
        var done = assert.async();

        // Удаление пользователя.
        $.when(pmUsers.deleteItem(999999, true)).done(function()
        {
            debugger;
            assert.ok(false, 'Успешно copyAndEdit add Item, а не должно было');
            render(done)
        }).fail(function(){
            assert.ok(true, 'Ошибка при copyAndEdit add Item, как и задумано');
            render(done)
        })
    });

    syncQUnit.addTest('Удаление копии пользователя', function ( assert )
    {
        var done = assert.async();

        // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
        // с адресом http://192.168.0.12:8080/?user-5
        var userId = /user\/([0-9]+)/.exec(window.location.href)[1]

        // Удаление пользователя.
        $.when(pmUsers.deleteItem(userId, true)).done(function()
        {
            assert.ok(true, 'Успешно delete add Item');
            render(done)
        }).fail(function()
        {
            debugger;
            assert.ok(false, 'Ошибка при delete add Item');
            render(done)
        })
    });
    */
        syncQUnit.addTest('Удаление пользователя', function ( assert )
        {
            var done = assert.async();

            // Удаление пользователя.
            $.when(pmUsers.deleteItem(userId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие profile текущего пользователя', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"profile/"+my_user_id})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню profile');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню profile');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение profile текущего пользователя', function ( assert )
        {
            var done = assert.async();

            $.when(pmUsers.updateProfile(my_user_id)).done(function()
            {
                assert.ok(true, 'Успешно сохранен profile');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при сохранении profile');
                render(done)
            })
        });
    }})


/**
 * Тестирование hosts
 */
window.qunitTestsArray.push({
    step:300,
    test:function()
    {
        syncQUnit.addTest('Открытие списка хостов', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"hosts"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню hosts');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню hosts');
                render(done)
            })
        });

        syncQUnit.addTest('Постраничная навигация хостов', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"hosts/page/999"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню hosts');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню hosts');
                render(done)
            })
        });

        syncQUnit.addTest('Страница создания хоста', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-host
            $.when(spajs.open({ menuId:"new-host"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-host');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-host');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Создание хоста', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания хоста
            var done = assert.async();

            // Заполнение формы с данными хоста
            $("#filed_name").val("test-host-"+t);

            $("#new_json_nameprefix").val("test1");
            $("#new_json_valueprefix").val("val1");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test2");
            $("#new_json_valueprefix").val("val2");
            jsonEditor.jsonEditorAddVar();


            // Отправка формы с данными хоста
            $.when(pmHosts.addItem()).done(function()
            {
                assert.ok(true, 'Успешно host add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при user add Item');
                render(done)
            })
        });

        var itemId = undefined
        syncQUnit.addTest('Изменение хоста', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования хоста
            // с адресом http://192.168.0.12:8080/?host-5
            itemId = /host\/([0-9]+)/.exec(window.location.href)[1]

            $("#filed_name").val("test2-hosts-"+t);

            $("#new_json_nameprefix").val("test3");
            $("#new_json_valueprefix").val("val3");
            jsonEditor.jsonEditorAddVar();


            $.when(pmHosts.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Копирование хоста', function ( assert )
        {
            var done = assert.async();

            $.when(pmHosts.copyAndEdit(itemId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление копии хоста', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var itemId = /host\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление пользователя.
            $.when(pmHosts.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление хоста', function ( assert )
        {
            var done = assert.async();

            // Удаление хоста.
            $.when(pmHosts.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });
    }})


/**
 * Тестирование groups
 */
window.qunitTestsArray.push({
    step:400,
    test:function()
    {
        syncQUnit.addTest('Проверка функции validateHostName', function ( assert ) {
            var done = assert.async();

            assert.ok(!pmGroups.validateHostName(), 'Host')
            assert.ok(!pmGroups.validateRangeName(), 'Range')

            assert.ok(pmGroups.validateHostName("192.168.0.12"), 'Host 192.168.0.12')
            assert.ok(pmGroups.validateHostName("local"), 'Host local')
            assert.ok(pmGroups.validateHostName("loc.ru"), 'Host loc.ru')

            assert.ok(pmGroups.validateRangeName("192.168.0.12"), 'Range 192.168.0.12')
            assert.ok(pmGroups.validateRangeName("local"), 'Range local')
            assert.ok(pmGroups.validateRangeName("loc.ru"), 'Range loc.ru')

            assert.ok(pmGroups.validateRangeName("19[2:7].168.0.12"), 'Range 19[2:7].168.0.12')
            assert.ok(pmGroups.validateRangeName("loc[a:f]l"), 'Range loc[a:f]l')
            assert.ok(pmGroups.validateRangeName("loc.[a:f]u"), 'Range loc.[a:f]u')

            render(done);
        });

        syncQUnit.addTest('Список групп', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"groups"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню groups');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню groups');
                render(done)
            })
        });

        syncQUnit.addTest('Страница создания группы', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-host
            $.when(spajs.open({ menuId:"new-group"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-group');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-group');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение группы', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания группы
            var done = assert.async();

            // Заполнение формы с данными группы
            $("#filed_name").val("test-group-"+t);

            $("#new_json_nameprefix").val("test1");
            $("#new_json_valueprefix").val("val1");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test2");
            $("#new_json_valueprefix").val("val2");
            jsonEditor.jsonEditorAddVar();

            $("#filed_children").addClass('selected');
            // Отправка формы с данными группы
            $.when(pmGroups.addItem()).done(function()
            {
                assert.ok(true, 'Успешно group add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при group add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Обновление группы', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

            $("#filed_name").val("test2-group-"+t);

            $("#new_json_nameprefix").val("test3");
            $("#new_json_valueprefix").val("val3");
            jsonEditor.jsonEditorAddVar();


            $.when(pmGroups.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Обновление группы setSubGroups', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]


            assert.ok(!pmGroups.hasGroups(itemId, 99999999999), 'pmGroups.hasGroups() вернула не тот результат');

            $.when(pmGroups.setSubGroups(itemId, [99999999999])).done(function()
            {
                assert.ok(true, 'Успешно setSubGroups');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при setSubGroups'); // На сервере такой группы наверное нет
                render(done)
            })
        });

        syncQUnit.addTest('Обновление группы setSubHosts', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]


            assert.ok(!pmGroups.hasHosts(itemId, 99999999999), 'pmGroups.hasHosts() вернула не тот результат');

            $.when(pmGroups.setSubHosts(itemId, [99999999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при setSubHosts');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Успешно setSubHosts'); // Group is children.
                render(done)
            })
        });

        syncQUnit.addTest('Открытие страницы списка групп данной группы', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

            // Открытие пункта меню new-host
            $.when(spajs.open({ menuId:"group/"+itemId+"/groups"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню списка групп данной группы');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню списка групп данной группы');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие страницы создания подгруппы', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

            $.when(spajs.open({ menuId:"group/"+itemId+"/groups/new-group"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню создания подгруппы new-group');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню создания подгруппы new-group');
                render(done)
            })
        });

        var itemId = undefined
        syncQUnit.addTest('Сохранение подгруппы', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания группы
            var done = assert.async();

            // Заполнение формы с данными группы
            $("#filed_name").val("test-sub-group-"+t);

            $("#new_json_nameprefix").val("test1");
            $("#new_json_valueprefix").val("val1");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test2");
            $("#new_json_valueprefix").val("val2");
            jsonEditor.jsonEditorAddVar();

            var master_group_itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
            itemId = master_group_itemId

            // Отправка формы с данными группы
            $.when(pmGroups.addItem('group', master_group_itemId)).done(function()
            {
                var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
                if(master_group_itemId != itemId)
                {
                    debugger;
                    assert.ok(false, 'Ошибка при добавлении подгруппы ' + master_group_itemId +"!="+ itemId);
                    render(done)
                }
                else
                {
                    assert.ok(true, 'Успешно group sub add Item');
                    render(done)
                }

            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при group sub add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Проверка добавления невалидных подгрупп', function ( assert )
        {
            var done = assert.async();
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmGroups.addSubGroups(itemId, [999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при добавлении подгруппы 999999 вроде бы нет');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Проверка добавления невалидных подгрупп успешна');
                render(done)
            })
        })

        syncQUnit.addTest('Проверка добавления невалидных хостов', function ( assert )
        {
            var done = assert.async();
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmGroups.addSubHosts(itemId, [999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при добавлении хоста 999999 вроде бы нет');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Проверка добавления невалидных хостов успешна');
                render(done)
            })
        })

        syncQUnit.addTest('Копирование группы', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

            var done = assert.async();
            $.when(pmGroups.copyAndEdit(itemId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit Item '+itemId);
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit Item '+itemId);
                render(done)
            })
        });

        syncQUnit.addTest('Удаление копии группы', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var itemId = /group\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление пользователя.
            $.when(pmGroups.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление группы', function ( assert )
        {
            var done = assert.async();

            // Удаление группы.
            $.when(pmGroups.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });




        syncQUnit.addTest('Страница создания группы не children', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-host
            $.when(spajs.open({ menuId:"new-group"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-group');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-group');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение группы не children', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания группы
            var done = assert.async();

            // Заполнение формы с данными группы
            $("#filed_name").val("test-group-"+t);

            $("#new_json_nameprefix").val("test3");
            $("#new_json_valueprefix").val("val3");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test4");
            $("#new_json_valueprefix").val("val4");
            jsonEditor.jsonEditorAddVar();

            // Отправка формы с данными группы
            $.when(pmGroups.addItem()).done(function()
            {
                assert.ok(true, 'Успешно group add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при group add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Обновление группы не children', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            itemId = /group\/([0-9]+)/.exec(window.location.href)[1]


            assert.ok(!pmGroups.hasGroups(itemId, 99999999999), 'pmGroups.hasGroups() вернула не тот результат');

            $.when(pmGroups.setSubGroups(itemId, [99999999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при setSubGroups'); // На сервере такой группы наверное нет
                render(done)
            }).fail(function(){
                assert.ok(true, 'Успешно setSubGroups'); // Group is children.
                render(done)
            })
        });

        syncQUnit.addTest('Обновление группы не children', function ( assert )
        {
            var done = assert.async();
            assert.ok(!pmGroups.hasHosts(itemId, 99999999999), 'pmGroups.hasHosts() вернула не тот результат');

            $.when(pmGroups.setSubHosts(itemId, [99999999999])).done(function()
            {
                assert.ok(true, 'Успешно setSubHosts'); // Group is children.
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при setSubHosts');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление группы не children', function ( assert )
        {
            var done = assert.async();
            itemId = /group\/([0-9]+)/.exec(window.location.href)[1]
            // Удаление группы.
            $.when(pmGroups.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });




    }})


/**
 * Тестирование inventories
 */
window.qunitTestsArray.push({
    step:500,
    test:function()
    {
        syncQUnit.addTest('Список инвенториев', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventories"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню inventories');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню inventories');
                render(done)
            })
        });

        syncQUnit.addTest('Страница нового inventory', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-inventory
            $.when(spajs.open({ menuId:"new-inventory"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-inventory');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-inventory');
                render(done)
            })
        });


        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение нового inventory', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания inventory
            var done = assert.async();

            // Заполнение формы с данными inventory
            $("#filed_name").val("test-inventory-"+t);

            $("#new_json_nameprefix").val("test1");
            $("#new_json_valueprefix").val("val1");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test2");
            $("#new_json_valueprefix").val("val2");
            jsonEditor.jsonEditorAddVar();


            // Отправка формы с данными inventory
            $.when(pmInventories.addItem()).done(function()
            {
                assert.ok(true, 'Успешно inventory add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при inventory add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Обновление inventory', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования inventory
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

            $("#filed_name").val("test2-inventory-"+t);

            $("#new_json_nameprefix").val("test3");
            $("#new_json_valueprefix").val("val3");
            jsonEditor.jsonEditorAddVar();

            $.when(pmInventories.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Проверка добавления невалидных подгрупп к inventory', function ( assert )
        {
            var done = assert.async();
            var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmInventories.addSubGroups(itemId, [999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при добавлении подгруппы 999999 вроде бы нет');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Проверка добавления невалидных подгрупп успешна');
                render(done)
            })
        })


        syncQUnit.addTest('Проверка добавления невалидных хостов к inventory', function ( assert )
        {
            var done = assert.async();
            var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmInventories.addSubHosts(itemId, [999999])).done(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при добавлении хоста 999999 вроде бы нет');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Проверка добавления невалидных хостов успешна');
                render(done)
            })
        })

        var itemId = undefined
        syncQUnit.addTest('Копирование Inventory', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

            var done = assert.async();
            $.when(pmInventories.copyAndEdit(itemId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Проверка функции автокомплита для групп', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

            pmGroups.groupsAutocompleteMatcher("A", function(res){
                assert.ok(true, 'Успешно');
            }, itemId)
        });

        syncQUnit.addTest('Удаление копии Inventory', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var itemId = /inventory\/([0-9]+)/.exec(window.location.href)[1]

            $.when(pmInventories.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Страница списка inventory History', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'inventory/'+itemId+'/history'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница списка inventory groups', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'inventory/'+itemId+'/groups'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Add existing group - empty', function ( assert )
        {
            var done = assert.async();
            $.when(pmGroups.addExistingChildItemToParent('inventory', 1)).done(function()
            {
                debugger;
                assert.ok(false, 'Группа добавилась, а не должна была');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ничего не добавлено, как и задумано');
                render(done)
            })
        })


        syncQUnit.addTest('Страница списка inventory groups/new-group', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'inventory/'+itemId+'/groups/new-group'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Создание новой группы - подэлемента inventory', function ( assert )
        {
            var done = assert.async();
            $('#filed_name').val("inv-sub-group");
            $.when(pmGroups.addItem('inventory', itemId)).done(function()
            {
                assert.ok(true, 'Subgroup успешно создана');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании Subgroup');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление  подгрупп - подэлементов inventory', function ( assert )
        {
            //предполагается, что с предыдущего теста мы попали на страницу  inventory/id/groups
            var done = assert.async();
            for(var i in pmGroups.model.selectedItems)
            {
                pmGroups.model.selectedItems[i] = true;
            }
            $.when(pmGroups.deleteChildrenFromParent('inventory', itemId)).done(function()
            {
                assert.ok(true, 'Subgroup успешно создана');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании Subgroup');
                render(done)
            })
        })


        syncQUnit.addTest('Страница inventory', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'inventory/'+itemId})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление inventory', function ( assert )
        {
            var done = assert.async();

            // Удаление inventory.
            $.when(pmInventories.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete Item');
                render(done)
            })
        });

        // Инвенторий закодированный в Base64
        var pmInventoriesText = "IyBIb3N0cyAKMS4yLjMuWzE6MjU1XSAKMTI0LjMuNC5bNDQ6\n\
NTVdIAoxMjQuMy41LlsxOjI1MF0gYW5zaWJsZV9ob3N0PTEwLjIwLjAuMiBhbnNpYmxlX3VzZXI9c\n\
m9vdCBhbnNpYmxlX3NzaF9wYXNzPWVhZGdiZSBhbnNpYmxlX3NzaF9wcml2YXRlX2tleV9maWxlPS\n\
9yb290L2YudHh0CjEyNC4zLjUuWzE6MjUxXSBhbnNpYmxlX2hvc3Q9IjEwLjIwLjAuMiIgYW5zaWJ\n\
sZV91c2VyPSdyb290JyBhbnNpYmxlX3NzaF9wYXNzPWVhZGdiZQoxMjQuMy41LlsxOjI1Ml0gYW5z\n\
aWJsZV9ob3N0PSIxMC4yMC4wLjEyIiBhbnNpYmxlX3VzZXI9J3Iib1wnb3QnIGFuc2libGVfc3NoX\n\
3Bhc3M9ZWFkZ2JlCiAgCiMgR2xvYmFsIHZhcnMKW2FsbDp2YXJzXQphbnNpYmxlX3VzZXI9Z3JleQ\n\
phbnNpYmxlX3NzaF9wcml2YXRlX2tleV9maWxlPS90bXAvdG1wUlE4ZVRjCmFuc2libGVfc3NoX2V\n\
4dHJhX2FyZ3M9LW8gU3RyaWN0SG9zdEtleUNoZWNraW5nPW5vIC1vIFVzZXJLbm93bkhvc3RzRmls\n\
ZT0vZGV2L251bGwKYW5zaWJsZV9zc2hfcHJpdmF0ZV9rZXlfZmlsZT0vcm9vdC9mLnR4dAoKIyBHc\n\
m91cHMgCltnaXQ6Y2hpbGRyZW5dCmNpCmdpdC1zZXJ2ZXJzCgoKW2Nsb3VkOmNoaWxkcmVuXQpnaX\n\
QKc2VydmljZXMKdGVzdAoKClt0ZXN0XQp0ZXN0LnZzdC5sYW4gYW5zaWJsZV91c2VyPWNlbnRvcwp\n\
0ZXN0Mi52c3QubGFuIGFuc2libGVfaG9zdD0xNzIuMTYuMS4yNgoKW3Rlc3Q6dmFyc10KYW5zaWJs\n\
ZV9zc2hfcHJpdmF0ZV9rZXlfZmlsZT0vcm9vdC9mLnR4dAogCltjaV0KZ2l0LWNpLTEgYW5zaWJsZ\n\
V9ob3N0PTE3Mi4xNi4xLjEzIGFuc2libGVfc3NoX3ByaXZhdGVfa2V5X2ZpbGU9L3Jvb3QvZi50eH\n\
QKZ2l0LWNpLTIgYW5zaWJsZV9ob3N0PTE3Mi4xNi4xLjE0CgoKW2dpdC1zZXJ2ZXJzXQpnaXQudnN\n\
0LmxhbiAKICAKCltzZXJ2aWNlc10KY2hhdC52c3Rjb25zdWx0aW5nLm5ldCBhbnNpYmxlX2hvc3Q9\n\
MTcyLjE2LjEuMTYKcGlwYy52c3QubGFuIApyZWRtaW5lLnZzdC5sYW4gCgoKW29wZW5zdGFja10KZ\n\
nVlbC52c3QubGFuIGFuc2libGVfaG9zdD0xMC4yMC4wLjIgYW5zaWJsZV91c2VyPXJvb3QgYW5zaW\n\
JsZV9zc2hfcGFzcz1lYWRnYmUKb3MtY29tcHV0ZS0xLnZzdC5sYW4gYW5zaWJsZV9ob3N0PTEwLjI\n\
wLjAuOQpvcy1jb21wdXRlLTIudnN0LmxhbiBhbnNpYmxlX2hvc3Q9MTAuMjAuMC4xMyBhbnNpYmxl\n\
X3NzaF9wcml2YXRlX2tleV9maWxlPS9yb290L2YudHh0Cm9zLWNvbnRyb2xsZXItMS52c3QubGFuI\n\
GFuc2libGVfaG9zdD0xMC4yMC4wLjYKb3MtY29udHJvbGxlci0yLnZzdC5sYW4gYW5zaWJsZV9ob3\n\
N0PTEwLjIwLjAuOAo="
        pmInventoriesText = Base64.decode(pmInventoriesText)

        /** Оригинал инвентория
         * # Hosts
         1.2.3.[1:255]
         124.3.4.[44:55]
         124.3.5.[1:250] ansible_host=10.20.0.2 ansible_user=root ansible_ssh_pass=eadgbe ansible_ssh_private_key_file=/root/f.txt
         124.3.5.[1:251] ansible_host="10.20.0.2" ansible_user='root' ansible_ssh_pass=eadgbe
         124.3.5.[1:252] ansible_host="10.20.0.12" ansible_user="r\"o\'ot" ansible_ssh_pass=eadgbe

         # Global vars
         [all:vars]
         ansible_user=grey
         ansible_ssh_private_key_file=/tmp/tmpRQ8eTc
         ansible_ssh_extra_args=-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
         ansible_ssh_private_key_file=/root/f.txt

         # Groups
         [git:children]
         ci
         git-servers


         [cloud:children]
         git
         services
         test


         [test]
         test.vst.lan ansible_user=centos
         test2.vst.lan ansible_host=172.16.1.26

         [test:vars]
         ansible_ssh_private_key_file=/root/f.txt

         [ci]
         git-ci-1 ansible_host=172.16.1.13 ansible_ssh_private_key_file=/root/f.txt
         git-ci-2 ansible_host=172.16.1.14


         [git-servers]
         git.vst.lan


         [services]
         chat.vstconsulting.net ansible_host=172.16.1.16
         pipc.vst.lan
         redmine.vst.lan


         [openstack]
         fuel.vst.lan ansible_host=10.20.0.2 ansible_user=root ansible_ssh_pass=eadgbe
         os-compute-1.vst.lan ansible_host=10.20.0.9
         os-compute-2.vst.lan ansible_host=10.20.0.13 ansible_ssh_private_key_file=/root/f.txt
         os-controller-1.vst.lan ansible_host=10.20.0.6
         os-controller-2.vst.lan ansible_host=10.20.0.8

         */

        syncQUnit.addTest('Открыть inventories/import', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:"inventories/import"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню inventories/import');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню inventories/import');
                render(done)
            })
        });

        var etalon = {"hosts":[{"name":"1.2.3.[1:255]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}},{"name":"124.3.4.[44:55]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}},{"name":"124.3.5.[1:250]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.2","ansible_user":"root","ansible_ssh_pass":"eadgbe","ansible_ssh_private_key_file":"/root/f.txt"}},{"name":"124.3.5.[1:251]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.2","ansible_user":"root","ansible_ssh_pass":"eadgbe"}},{"name":"124.3.5.[1:252]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.12","ansible_user":"r\"o'ot","ansible_ssh_pass":"eadgbe"}}],"groups":{"git":{"notes":"","vars":{},"groups":["ci","git-servers"],"hosts":[],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"children":true,"dataLevel":{"level":2,"parents":["all","cloud","git"]}},"ci":{"notes":"","vars":{},"groups":[],"hosts":[{"name":"git-ci-1","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"172.16.1.13","ansible_ssh_private_key_file":"/root/f.txt"}},{"name":"git-ci-2","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"172.16.1.14"}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":3,"parents":["all","cloud","git","ci"]}},"git-servers":{"notes":"","vars":{},"groups":[],"hosts":[{"name":"git.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":3,"parents":["all","cloud","git","git-servers"]}},"cloud":{"notes":"","vars":{},"groups":["git","services","test"],"hosts":[],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"children":true,"dataLevel":{"level":1,"parents":["all","cloud"]}},"services":{"notes":"","vars":{},"groups":[],"hosts":[{"name":"chat.vstconsulting.net","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"172.16.1.16"}},{"name":"pipc.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}},{"name":"redmine.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":2,"parents":["all","cloud","services"]}},"test":{"notes":"","vars":{"ansible_ssh_private_key_file":"/root/f.txt"},"groups":[],"hosts":[{"name":"test.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_user":"centos"}},{"name":"test2.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"172.16.1.26"}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":2,"parents":["all","cloud","test"]}},"openstack":{"notes":"","vars":{},"groups":[],"hosts":[{"name":"fuel.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.2","ansible_user":"root","ansible_ssh_pass":"eadgbe"}},{"name":"os-compute-1.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.9"}},{"name":"os-compute-2.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.13","ansible_ssh_private_key_file":"/root/f.txt"}},{"name":"os-controller-1.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.6"}},{"name":"os-controller-2.vst.lan","notes":"","type":"HOST","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{"ansible_host":"10.20.0.8"}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":1,"parents":["all","openstack"]}}},"vars":{"ansible_user":"grey","ansible_ssh_private_key_file":"/root/f.txt","ansible_ssh_extra_args":"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"},"name":"inventory","notes":""}
        var inventory = undefined;

        syncQUnit.addTest('Парсинг inventory', function ( assert )
        {
            var done = assert.async();
            inventory = pmInventories.parseFromText(pmInventoriesText)
            inventory.name = "inventory"
            pmInventories.model.importedInventories = {}
            pmInventories.model.importedInventories = {
                inventory:inventory,
                text:pmInventoriesText
            }

            var res = deepEqual(etalon, inventory)
            assert.ok(res, 'Сравнение инвентория распарсенного и оригинального');
            render(done)
        });

        syncQUnit.addTest('Импорт не валидного inventory 1', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventories/import"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню inventories/import');
                $("#inventory_name").val("inventory")

                $.when(pmInventories.importInventory(inventory)).done(function()
                {
                    debugger;
                    assert.ok(false, 'Успешно импортирован не валидный инвенторий (а это не правильно)');
                    render(done)
                }).fail(function()
                {
                    assert.ok(true, 'Ошибка в импорте не валидного инвентория (как и задумано)');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню inventories/import');
                render(done)
            })
        });

        syncQUnit.addTest('Импорт валидного inventory', function ( assert )
        {
            delete inventory.vars.ansible_ssh_private_key_file
            for(var i in inventory.hosts)
            {
                delete inventory.hosts[i].vars.ansible_ssh_private_key_file
            }
            for(var i in inventory.groups)
            {
                delete inventory.groups[i].vars.ansible_ssh_private_key_file
                for(var j in inventory.groups[i].hosts)
                {
                    delete inventory.groups[i].hosts[j].vars.ansible_ssh_private_key_file
                }
            }
            var done = assert.async();
            $("#inventory_name").val("inventory")
            $.when(pmInventories.importInventory(inventory)).done(function()
            {
                assert.ok(true, 'Успешно импортирован инвенторий');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка в импорте инвентория');
                render(done)
            })
        });

        syncQUnit.addTest('Импорт не валидного inventory', function ( assert )
        {
            var done = assert.async();
            inventory.groups["error group"] = {
                "vars": {},
                "groups": [],
                "hosts": [],
                "children": true
            }

            $("#inventory_name").val("inventory")
            $.when(pmInventories.importInventory(inventory)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно импортирован инвенторий а должна быть ошибка');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка в импорте инвентория как и задумано');
                render(done)
            })

        });

        syncQUnit.addTest('Парсинг inventory 2', function ( assert )
        {
            var done = assert.async();
            var inventoryText = "W3NlcnZlcnM6Y2hpbGRyZW5dCnVzdWFsCnVudXN1YWwKW3VzdWFsXQ\
oxNzIuMTYuMS5bMzA6MzFdClt1bnVzdWFsXQpbc2VydmVyczp2YXJzXQphbnNpYmxlX3VzZXI9Y2Vud\
G9zCmFuc2libGVfc3NoX3ByaXZhdGVfa2V5X2ZpbGU9L2hvbWUvY2VwcmV1L2RlZmF1bHQucGVtCmFu\
c2libGVfYmVjb21lPXRydWU="
            inventoryText = Base64.decode(inventoryText)

            inventory = pmInventories.parseFromText(inventoryText)
            var etalon = {"hosts":[],"groups":{"servers":{"notes":"","vars":{"ansible_user":"centos","ansible_ssh_private_key_file":"/home/cepreu/default.pem","ansible_become":"true"},"groups":["usual","unusual"],"hosts":[],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"children":true,"dataLevel":{"level":1,"parents":["all","servers"]}},"usual":{"notes":"","vars":{},"groups":[],"hosts":[{"name":"172.16.1.[30:31]","notes":"","type":"RANGE","all_only":false,"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"vars":{}}],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":2,"parents":["all","servers","usual"]}},"unusual":{"notes":"","vars":{},"groups":[],"hosts":[],"matches":false,"match_id_arr":[],"match_arr":[],"extern":false,"dataLevel":{"level":2,"parents":["all","servers","unusual"]}}},"vars":{},"name":"inventory","notes":""}
            inventory.name = "inventory"

            var res = deepEqual(etalon, inventory)
            assert.ok(res, 'Сравнение инвентория 2 распарсенного и оригинального');
            render(done)
        });
    }})

/**
 * Тестирование projects
 */
window.qunitTestsArray.push({
    step:600,
    test:function()
    {
        syncQUnit.addTest('Список проектов', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"projects"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню projects');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню projects');
                render(done)
            })
        });

        syncQUnit.addTest('Новый проект', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-project
            $.when(spajs.open({ menuId:"new-project"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-project');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-project');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение проекта', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#filed_name").val("test-project-"+t);
            $("#new_project_repository").val("git://test-project-"+t);

            $("#new_json_nameprefix").val("test1");
            $("#new_json_valueprefix").val("val1");
            jsonEditor.jsonEditorAddVar();

            $("#new_json_nameprefix").val("test2");
            $("#new_json_valueprefix").val("val2");
            jsonEditor.jsonEditorAddVar();


            // Отправка формы с данными project
            $.when(pmProjects.addItem()).done(function()
            {
                assert.ok(true, 'Успешно project add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при project add Item');
                render(done)
            })
        });

        var project_id = undefined
        syncQUnit.addTest('Изменение проекта', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            project_id = itemId;

            $("#project_"+itemId+"_name").val("test2-project-"+t);

            $("#new_json_nameprefix").val("test3");
            $("#new_json_valuprefixe").val("val3");
            jsonEditor.jsonEditorAddVar();


            $.when(pmProjects.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение проекта repo_sync_on_run true', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5

            $("#filed_repo_sync_on_run").addClass("selected");


            $.when(pmProjects.updateItem(project_id)).done(function()
            {
                if(pmProjects.model.items[project_id].vars.repo_sync_on_run == true)
                {
                    assert.ok(true, 'Успешно update add Item');
                    render(done)
                }
                else
                {
                    debugger;
                    assert.ok(false, 'Ошибка при update add Item');
                    render(done)
                }
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение проекта repo_sync_on_run false', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5

            $("#filed_repo_sync_on_run").removeClass("selected");


            $.when(pmProjects.updateItem(project_id)).done(function()
            {
                if(pmProjects.model.items[project_id].vars.repo_sync_on_run === undefined)
                {
                    assert.ok(true, 'Успешно update add Item');
                    render(done)
                }
                else
                {
                    debugger;
                    assert.ok(false, 'Ошибка при update add Item');
                    render(done)
                }
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        syncQUnit.addTest('pmProjects.syncRepo', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmProjects.syncRepo(itemId)).done(function()
            {
                assert.ok(true, 'Успешно syncRepo');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при syncRepo');
                render(done)
            })
        });

        syncQUnit.addTest('pmProjects.executePlaybook', function ( assert )
        {
            var done = assert.async();
            $('#inventories-autocomplete').val('')
            $('#playbook-autocomplete').val('')

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(pmProjects.executePlaybook(itemId)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно executePlaybook');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при executePlaybook');
                render(done)
            })
        });

        syncQUnit.addTest('Страница Run playbook', function ( assert )
        {
            var done = assert.async();
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+itemId+'/playbook/run'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('run playbooke с ошибкой 1', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

            // Отправка формы с данными project
            $.when(pmTasks.execute(itemId, 99999, "main.yml")).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно Execute ansible module, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка Execute ansible module, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('run playbook с ошибкой 2', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.__devAddVar("test1", "test1", "playbook")

            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var inventoryId = $("#inventories-autocomplete option")[1].value // Надеемся что там есть хоть один инвенторий
            $('#inventories-autocomplete').val(inventoryId)

            // Отправка формы с данными project
            $.when(pmTasks.execute(itemId, $('#inventories-autocomplete').val(), "main.yml")).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно Execute ansible module, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка Execute ansible module, как и задумано');
                render(done)
            })

        });

        syncQUnit.addTest('run playbook', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("test1")

            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var inventoryId = $("#inventories-autocomplete option")[1].value // Надеемся что там есть хоть один инвенторий

            $('#inventories-autocomplete').val(inventoryId)
            // Отправка формы с данными project
            $.when(pmTasks.execute(itemId, $('#inventories-autocomplete').val(), "main.yml")).done(function()
            {
                assert.ok(true, 'Успешно Execute ansible module, как и задумано');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка Execute ansible module, а не должно было');
                render(done)
            })
        });

        var projectId = undefined
        syncQUnit.addTest('Страница Execute ansible module', function ( assert )
        {
            var done = assert.async();
            projectId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+projectId+'/ansible-module/run'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Execute ansible module с ошибкой 1', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#module-autocomplete").val("test");
            jsonEditor.jsonEditorRmVar("test1")

            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

            var inventoryId = $("#inventories-autocomplete option")[1].value // Надеемся что там есть хоть один инвенторий

            $.when(pmModuleTemplates.selectInventory(inventoryId)).done(function()
            {
                pmAnsibleModule.selectInventory(inventoryId)
                // Отправка формы с данными project
                $.when(pmAnsibleModule.execute(itemId, 99999, "All", $('#module-autocomplete').val())).done(function()
                {
                    debugger;
                    assert.ok(false, 'Успешно Execute ansible module, а не должно было');
                    render(done)
                }).fail(function()
                {
                    assert.ok(true, 'Ошибка Execute ansible module, как и задумано');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при selectInventory');
            })
        });

        syncQUnit.addTest('Execute ansible module с ошибкой 2', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#module-autocomplete").val("test");

            jsonEditor.__devAddVar("test1", "test1", "playbook")


            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

            var inventoryId = $("#inventories-autocomplete option")[1].value // Надеемся что там есть хоть один инвенторий

            $.when(pmModuleTemplates.selectInventory(inventoryId)).done(function()
            {
                $('#inventories-autocomplete').val(inventoryId)
                // Отправка формы с данными project
                $.when(pmAnsibleModule.execute(itemId, $('#inventories-autocomplete').val(), "All", $('#module-autocomplete').val())).done(function()
                {
                    debugger;
                    assert.ok(false, 'Успешно Execute ansible module, а не должно было');
                    render(done)
                }).fail(function()
                {
                    assert.ok(true, 'Ошибка Execute ansible module, как и задумано');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при selectInventory');
            })
        });

        syncQUnit.addTest('Execute ansible module', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#module-autocomplete").val("test");
            jsonEditor.jsonEditorRmVar("test1")

            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

            var inventoryId = $("#inventories-autocomplete option")[1].value // Надеемся что там есть хоть один инвенторий

            $.when(pmModuleTemplates.selectInventory(inventoryId)).done(function()
            {
                $('#inventories-autocomplete').val(inventoryId)
                // Отправка формы с данными project
                $.when(pmAnsibleModule.execute(itemId, $('#inventories-autocomplete').val(), "All", $('#module-autocomplete').val())).done(function()
                {
                    assert.ok(true, 'Успешно Execute ansible module, как и задумано');
                    render(done)
                }).fail(function()
                {
                    debugger;
                    assert.ok(false, 'Ошибка Execute ansible module, а не должно было');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при selectInventory');
            })
        });

        syncQUnit.addTest('Страница periodic-tasks', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'project/'+projectId+'/periodic-tasks'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница periodic-tasks.toggleSelectEachItem', function ( assert )
        {
            var done = assert.async();
            $.when(pmPeriodicTasks.toggleSelectEachItem(true, projectId)).done(function()
            {
                assert.ok(true, 'ok:toggleSelectEachItem');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:toggleSelectEachItem');
                render(done)
            })
        })

        syncQUnit.addTest('Страница periodic-tasks.search', function ( assert )
        {
            var done = assert.async();
            $.when(pmPeriodicTasks.search("test", {project_id:projectId})).done(function()
            {
                assert.ok(true, 'ok:periodic-tasks.search');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:periodic-tasks.search');
                render(done)
            })
        })

        // pmPeriodicTasks.showSearchResults

        /*
    syncQUnit.addTest('Страница нового inventory для проекта', function ( assert )
    {
        var done = assert.async();

        var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
        // Открытие пункта меню new-inventory
        $.when(spajs.open({ menuId:'project/'+itemId+"/new-inventory"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню new-inventory');
            render(done)
        }).fail(function()
        {
            debugger;
            assert.ok(false, 'Ошибка при открытиии меню new-inventory');
            render(done)
        })
    });

    var t = new Date();
    t = t.getTime()

    syncQUnit.addTest('Сохранение нового inventory', function ( assert )
    {
        // Предполагается что мы от прошлого теста попали на страницу создания inventory
        var done = assert.async();

        // Заполнение формы с данными inventory
        $("#filed_name").val("test-inventory-"+t);

        $("#new_json_name").val("test1");
        $("#new_json_value").val("val1");
        jsonEditor.jsonEditorAddVar();

        $("#new_json_name").val("test2");
        $("#new_json_value").val("val2");
        jsonEditor.jsonEditorAddVar();


        var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
        // Отправка формы с данными inventory
        $.when(pmInventories.addItem('project', itemId)).done(function()
        {
            assert.ok(true, 'Успешно inventory add Item');
            render(done)
        }).fail(function()
        {
            debugger;
            assert.ok(false, 'Ошибка при inventory add Item');
            render(done)
        })
    });
*/
        syncQUnit.addTest('Страница нового inventory', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-inventory
            $.when(spajs.open({ menuId:"new-inventory"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-inventory');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-inventory');
                render(done)
            })
        });

        var inventory_id = undefined;
        syncQUnit.addTest('Сохранение нового inventory', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания inventory
            var done = assert.async();

            // Заполнение формы с данными inventory
            $("#filed_name").val("test-inventory-"+t);

            jsonEditor.__devAddVar("test1", "test1", "inventory")
            jsonEditor.__devAddVar("test2", "test2", "inventory")


            // Отправка формы с данными inventory
            $.when(pmInventories.addItem()).done(function()
            {
                inventory_id = /inventory\/([0-9]+)/.exec(window.location.href)[1]
                assert.ok(true, 'Успешно inventory add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при inventory add Item');
                render(done)
            })
        });


        syncQUnit.addTest('Страница Create new periodic task', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'project/'+project_id+'/new-periodic-tasks'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })


        syncQUnit.addTest('Создание не валидного periodic task', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#new_periodic-tasks_name").val("test-project-"+t);
            $("#new_periodic-tasks_playbook").val("test-project-"+t);

            $("#new_periodic-tasks_schedule_INTERVAL").val(t);

            jsonEditor.__devAddVar("test1", "test1", "periodic_playbook", 'PLAYBOOK')


            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var inventoryId = $("#inventories-autocomplete option")[0].value

            $.when(pmPeriodicTasks.selectInventory(inventoryId)).done(function()
            {
                $("#inventories-autocomplete").val(inventoryId)

                // Отправка формы с данными project
                $.when(pmPeriodicTasks.addItem(itemId)).done(function()
                {
                    debugger;
                    assert.ok(false, 'Успешно project add pmPeriodicTasks, а не должно было');
                    render(done)
                }).fail(function()
                {
                    assert.ok(true, 'Ошибка при project add pmPeriodicTasks, как и задумано');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при selectInventory');
            })
        });

        syncQUnit.addTest('Создание periodic task', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar('test1', 'PLAYBOOK')

            // Заполнение формы с данными project
            $("#new_periodic-tasks_name").val("test-project-"+t);
            $("#new_periodic-tasks_playbook").val("test-project-"+t);

            $("#new_periodic-tasks_schedule_INTERVAL").val(t);

            $("#new_json_namePLAYBOOK").val("become-method");
            $("#new_json_valuePLAYBOOK").val("val1");
            jsonEditor.jsonEditorAddVar('periodic_playbook', "PLAYBOOK");


            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var inventoryId = $("#inventories-autocomplete option")[0].value

            $.when(pmPeriodicTasks.selectInventory(inventoryId)).done(function()
            {
                $("#inventories-autocomplete").val(inventoryId)

                // Отправка формы с данными project
                $.when(pmPeriodicTasks.addItem(itemId)).done(function()
                {
                    assert.ok(true, 'Успешно project add pmPeriodicTasks');
                    render(done)
                }).fail(function()
                {
                    debugger;
                    assert.ok(false, 'Ошибка при project add pmPeriodicTasks');
                    render(done)
                })
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при selectInventory');
            })
        });

        syncQUnit.addTest('Изменение не валидного periodic task', function ( assert )
        {
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var taskId = /periodic-task\/([0-9]+)/.exec(window.location.href)[1]
            // Предполагается что мы от прошлого теста попали на страницу создания inventory
            var done = assert.async();

            // Заполнение формы с данными inventory
            $("#periodic-tasks_"+taskId+"_name").val("test-task2-"+t);

            jsonEditor.__devAddVar("test1", "test1", "periodic_playbook", "PLAYBOOK")

            // Отправка формы с данными inventory
            $.when(pmPeriodicTasks.updateItem(taskId, {project_id:itemId})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно update Periodic Task, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при update Periodic Task, как и задуманно');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение periodic task', function ( assert )
        {
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            var taskId = /periodic-task\/([0-9]+)/.exec(window.location.href)[1]
            // Предполагается что мы от прошлого теста попали на страницу создания inventory
            var done = assert.async();

            // Заполнение формы с данными inventory
            $("#periodic-tasks_"+taskId+"_name").val("test-task2-"+t);

            jsonEditor.jsonEditorRmVar('test1', 'PLAYBOOK')

            $("#new_json_namePLAYBOOK").val("private-key");
            $("#new_json_valuePLAYBOOK").val("PLAYBOOK");
            jsonEditor.jsonEditorAddVar('periodic_playbook', 'PLAYBOOK');

            // Отправка формы с данными inventory
            $.when(pmPeriodicTasks.updateItem(taskId, {project_id:itemId})).done(function()
            {
                assert.ok(true, 'Успешно update Periodic Task');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при update Periodic Task');
                render(done)
            })
        });

        var taskId = undefined
        syncQUnit.addTest('Копирование Periodic Task', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            taskId = /periodic-task\/([0-9]+)/.exec(window.location.href)[1]

            var done = assert.async();
            $.when(pmPeriodicTasks.copyAndEdit(taskId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление копии Periodic Task', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var taskId = /periodic-task\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление пользователя.
            $.when(pmPeriodicTasks.deleteItem(taskId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        syncQUnit.addTest('execute для Periodic Task', function ( assert )
        {
            var done = assert.async();

            // Удаление пользователя.
            $.when(pmPeriodicTasks.execute(projectId, taskId)).done(function()
            {
                assert.ok(true, 'Успешно execute для pmPeriodicTasks');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при execute для pmPeriodicTasks');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление periodic task', function ( assert )
        {
            var done = assert.async();

            // Удаление project.
            $.when(pmPeriodicTasks.deleteItem(taskId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete Item');
                render(done)
            })
        });

        syncQUnit.addTest('Страница списка periodic task', function ( assert )
        {
            var done = assert.async();
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+itemId+'/periodic-tasks'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница списка шаблонов проекта', function ( assert )
        {
            var done = assert.async();
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+itemId+'/templates'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница нового task template проекта', function ( assert )
        {
            var done = assert.async();
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+itemId+'/template/new-task'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Сохранение нового task template проекта', function ( assert )
        {
            var done = assert.async();
            $("#Templates-name").val("task-template-project");
            $.when(pmTasksTemplates.addItem()).done(function()
            {
                assert.ok(true, 'Шаблон успешно создан');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании шаблона');
                render(done)
            })
        })

        var project_id = undefined;
        var template_id = undefined;
        syncQUnit.addTest('Открытие списка опций шаблона задач проекта', function ( assert )
        {
            var done = assert.async();
            project_id = /project\/([0-9]+)/.exec(window.location.href)[1];
            template_id = /Task\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id+'/options'})).done(function()
            {
                assert.ok(true, 'Страница успешно открыта');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытии страницы');
                render(done)
            })
        })

        syncQUnit.addTest('Открытие страницы создания новой опции шаблона задач проекта', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id+'/new-option'})).done(function()
            {
                assert.ok(true, 'Страница успешно открыта');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытии страницы');
                render(done)
            })
        })

        syncQUnit.addTest('Сохранение новой опции шаблона задач проекта', function ( assert )
        {
            var done = assert.async();

            $('#filed_option_name').val('test-option');
            $("#new_json_nameprefix").val("become");
            jsonEditor.jsonEditorAddVar();

            $.when(pmTasksTemplates.saveNewOption(template_id)).done(function()
            {
                assert.ok(true, 'Опция успешно создана');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании опции');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление опции шаблона задач проекта', function ( assert )
        {
            var done = assert.async();

            $.when(pmTasksTemplates.removeOption(template_id,'test-option')).done(function()
            {
                assert.ok(true, 'Опция успешно удалена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при удалении опции');
                render(done)
            })
        })

        syncQUnit.addTest('Страница списка периодических тасок шаблона проекта', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id+'/periodic-tasks'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница создания новой периодической таски шаблона проекта', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id+'/new-periodic-task'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Создание новой периодической таски шаблона проекта', function ( assert )
        {
            var done = assert.async();

            $('#new_periodic-tasks_name').val('new-pt2');
            $('#new_periodic-tasks_schedule_INTERVAL').val(60);

            $.when(pmPeriodicTasks.addItem(project_id)).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление периодической таски шаблона проекта', function ( assert )
        {
            var done = assert.async();
            var item_id = /periodic-task\/([0-9]+)/.exec(window.location.href)[1];

            $.when(pmPeriodicTasks.deleteItem(item_id, true)).done(function()
            {
                assert.ok(true, 'Периодическая такса успешно удалена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при удалении периодической таски');
                render(done)
            })
        })

        syncQUnit.addTest('Страница истории запусков шаблона проекта', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id+'/history'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница шаблона проекта', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:'project/'+project_id+'/template/Task/'+template_id})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Создание копии шаблона проекта', function ( assert )
        {
            var done = assert.async();
            $.when(pmTasksTemplates.copyAndEdit(template_id,"project/"+project_id+"/template/Task")).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление копии шаблона проекта', function ( assert )
        {
            var done = assert.async();
            var copy_template_id = /Task\/([0-9]+)/.exec(window.location.href)[1];
            $.when(pmTasksTemplates.deleteItem(copy_template_id, true, "project/"+project_id+"/template/Task/"+template_id)).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление шаблона проекта', function ( assert )
        {
            var done = assert.async();
            $.when(pmTasksTemplates.deleteItem(template_id, true, "project/"+project_id+"/templates")).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Страница списка History', function ( assert )
        {
            var done = assert.async();
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]
            $.when(spajs.open({ menuId:'project/'+itemId+'/history'})).done(function()
            {
                assert.ok(true, 'Страница открылась');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Страница не открылась');
                render(done)
            })
        })

        syncQUnit.addTest('Удаление проекта', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?project-5
            var itemId = /project\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление project.
            $.when(pmProjects.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при delete Item');
                render(done)
            })
        });
    }})

/**
 * Тестирование шаблонов
 */
window.qunitTestsArray.push({
    step:700,
    test:function()
    {
        syncQUnit.addTest('Список шаблонов', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"templates"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates');
                render(done)
            })
        });

        syncQUnit.addTest('Новый template/new-task', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-project
            $.when(spajs.open({ menuId:"template/new-task"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-project');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-project');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение не валидного шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#Templates-name").val("!2 d#");

            jsonEditor.__devAddVar("syntax-check32", "syntax-check32")

            jsonEditor.jsonEditorImportVars("playbook", "prefix", "syntax-check=\n")
            jsonEditor.jsonEditorImportVars("playbook", "prefix", "syntax-check:\n")

            // Отправка формы с данными project
            $.when(pmTasksTemplates.addItem()).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно template add Item, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при template add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#Templates-name").val("test-template-"+t);
            jsonEditor.jsonEditorRmVar("syntax-check32");

            // Отправка формы с данными project
            $.when(pmTasksTemplates.addItem()).done(function()
            {
                assert.ok(true, 'Успешно template add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при template add Item');
                render(done)
            })
        });

        //тестируем опции шаблона
        var itemIdForOptionTest=undefined;
        syncQUnit.addTest('Открытие страницы списка опций шаблона задачи', function ( assert )
        {
            var done = assert.async();
            itemIdForOptionTest = /template\/Task\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:"template/Task/"+itemIdForOptionTest+"/options"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Task/item_id/options');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Task/item_id/options');
                render(done)
            })
        });


        syncQUnit.addTest('Открытие страницы создания новой опции шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();
            itemIdForOptionTest = /template\/Task\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:"template/Task/"+itemIdForOptionTest+"/new-option"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Task/item_id/new-option');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Task/item_id/new-option');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой невалидной опции шаблона задачи', function ( assert )
        {
            var done = assert.async();

            //пытаемся сохранить пустую опцию, даже не задав имя
            $.when(pmTasksTemplates.saveNewOption(itemIdForOptionTest)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно сохранено, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой невалидной опции шаблона задачи 2', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            $("#filed_option_name").val("test-option");

            //пытаемся сохранить пустую опцию, с именем, но идентичную шаблону
            $.when(pmTasksTemplates.saveOption(itemIdForOptionTest)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно сохранено, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой валидной опции шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("become2")
            $("#new_json_nameprefix").val("become");
            jsonEditor.jsonEditorAddVar();

            $.when(pmTasksTemplates.saveNewOption(itemIdForOptionTest)).done(function()
            {
                assert.ok(true, 'Опция успешно сохранена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении опции');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение опции шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("check2")
            $("#new_json_nameprefix").val("check");
            jsonEditor.jsonEditorAddVar();

            $.when(pmTasksTemplates.saveOption(itemIdForOptionTest)).done(function()
            {
                assert.ok(true, 'Опция успешно изменена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при изменении опции');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение и запуск опции шаблона задачи', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу просмотра/редактирования опции шаблона
            var done = assert.async();

            $.when(pmTasksTemplates.saveAndExecuteOption(itemIdForOptionTest)).done(function()
            {
                assert.ok(true, 'Опция успешно сохранена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении опции');
                render(done)
            })
        });

        //открываем стрницу для создания новой опции для дальнейших тестов
        syncQUnit.addTest('Открытие страницы создания новой опции шаблона задачи', function ( assert )
        {
            var done = assert.async();
            $.when(spajs.open({ menuId:"template/Task/"+itemIdForOptionTest+"/new-option"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Task/item_id/new-option');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Task/item_id/new-option');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой опции с уже существующим именем', function ( assert )
        {
            var done = assert.async();

            $("#filed_option_name").val("test-option");
            jsonEditor.jsonEditorRmVar("become2")
            $("#new_json_nameprefix").val("become");
            jsonEditor.jsonEditorAddVar();


            $.when(pmTasksTemplates.saveNewOption(itemIdForOptionTest)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно сохранено, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой опции с новым именем', function ( assert )
        {
            var done = assert.async();

            $("#filed_option_name").val("test-option2");

            $.when(pmTasksTemplates.saveNewOption(itemIdForOptionTest)).done(function()
            {
                assert.ok(true, 'Успешно сохранено');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление опции', function ( assert )
        {
            var done = assert.async();

            $.when(pmTasksTemplates.removeOption(itemIdForOptionTest)).done(function()
            {
                assert.ok(true, 'Опция успешно удалена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при удалении опции');
                render(done)
            })
        });

        //конец тестирования опции шаблона

        //начинаем тестирование переодических тасок через шаблоны
        var itemIdForPT = undefined;
        syncQUnit.addTest('Открытие страницы списка периодических тасок шаблона задачи', function ( assert )
        {
            var done = assert.async();
            itemIdForPT = /template\/Task\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:"template/Task/"+itemIdForPT+"/periodic-tasks"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Task/item_id/periodic-tasks');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Task/item_id/periodic-tasks');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие страницы создания новой периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/"+itemIdForPT+"/new-periodic-task"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Task/item_id/new-periodic-task');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Task/item_id/new-periodic-task');
                render(done)
            })
        });


        syncQUnit.addTest('Создание новой периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            $("#new_periodic-tasks_name").val("new-pt");
            $("#new_periodic-tasks_schedule_INTERVAL").val(60);

            var project_id = pmTasksTemplates.model.items[itemIdForPT].data.project;

            $.when(pmPeriodicTasks.addItem(project_id)).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно создана');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании periodic task for template');
                render(done)
            })
        });


        syncQUnit.addTest('Изменение периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            var project_id = pmTasksTemplates.model.items[itemIdForPT].data.project;
            var pt_id = /template\/Task\/([0-9]+)\/periodic-task\/([0-9]+)/.exec(window.location.href)[2];
            $("#periodic-tasks_"+pt_id+"_schedule_INTERVAL").val(3600);

            $.when(pmPeriodicTasks.updateItem(pt_id, {project_id:project_id})).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно изменена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при изменении periodic task for template');
                render(done)
            })
        });


        syncQUnit.addTest('Удаление периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            var pt_id = /template\/Task\/([0-9]+)\/periodic-task\/([0-9]+)/.exec(window.location.href)[2];

            $.when(pmPeriodicTasks.deleteItem(pt_id, true)).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно удалена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при удалении periodic task for template');
                render(done)
            })
        });
        //конец тестирования переодических тасок через шаблоны

        syncQUnit.addTest('Открытие страницы шаблона шаблона', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/"+itemIdForPT})).done(function()
            {
                assert.ok(true, 'Успешно открыт шаблон');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при открытии шаблона');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение не валидного шаблона', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /template\/Task\/([0-9]+)/.exec(window.location.href)[1]

            $("#playbook-autocomplete").val("test2-playbook-"+t);

            jsonEditor.__devAddVar("syntax-check22", "syntax-check22")

            $.when(pmTasksTemplates.updateItem(itemId)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно template update Item, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при template update Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение шаблона', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /template\/Task\/([0-9]+)/.exec(window.location.href)[1]
            $("#playbook-autocomplete").val("test2-playbook-"+t);
            $("#projects-autocomplete").val($("#projects-autocomplete option")[0].value).trigger('change.select2');
            $("#inventories-autocomplete").val($("#inventories-autocomplete option")[0].value).trigger('change.select2');

            jsonEditor.jsonEditorRmVar("syntax-check22");
            $("#new_json_nameprefix").val("new-vault-password-file");
            $("#new_json_valueprefix").val("syntax-check");
            jsonEditor.jsonEditorAddVar();


            $.when(pmTasksTemplates.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        var itemId = undefined
        syncQUnit.addTest('Копирование template Task', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу редактирования группы
            // с адресом http://192.168.0.12:8080/?group-5
            itemId = /template\/Task\/([0-9]+)/.exec(window.location.href)[1]

            var done = assert.async();
            $.when(pmTasksTemplates.copyAndEdit(itemId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit add Item');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление копии template Task', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var itemId = /template\/Task\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление пользователя.
            $.when(pmTasksTemplates.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });


        // syncQUnit.addTest('Сохранение и запуск шаблона', function ( assert )
        // {
        //     var done = assert.async();
        //
        //     $.when(spajs.open({ menuId:"template/Task/"+itemId})).done(function()
        //     {
        //         $.when(pmTasksTemplates.saveAndExecute(itemId)).done(function()
        //         {
        //             assert.ok(true, 'Успешно pmTasksTemplates.saveAndExecute');
        //             render(done)
        //         }).fail(function(){
        //             debugger;
        //             assert.ok(false, 'Ошибка при pmTasksTemplates.saveAndExecute');
        //             render(done)
        //         })
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Ошибка при открытиии меню template/Module/'+itemId);
        //         render(done)
        //     })
        // });

        // var tt_history_id = undefined;
        // syncQUnit.addTest('Страница списка task template History', function ( assert )
        // {
        //
        //     tt_history_id=/history\/([0-9]+)/.exec(window.location.href)[1];
        //     var done = assert.async();
        //     $.when(spajs.open({ menuId:'template/Task/'+itemId+'/history'})).done(function()
        //     {
        //         assert.ok(true, 'Страница открылась');
        //         render(done)
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Страница не открылась');
        //         render(done)
        //     })
        // })
        //
        // syncQUnit.addTest('Страница task template History Item', function ( assert )
        // {
        //     var done = assert.async();
        //     $.when(spajs.open({ menuId:'template/Task/'+itemId+'/history/'+tt_history_id})).done(function()
        //     {
        //         assert.ok(true, 'Страница открылась');
        //         render(done)
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Страница не открылась');
        //         render(done)
        //     })
        // })

        syncQUnit.addTest('Удаление шаблона', function ( assert )
        {
            var done = assert.async();

            // Удаление project.
            $.when(pmTasksTemplates.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при delete Item');
                render(done)
            })
        });
    }})

/**
 * Тестирование шаблонов модулей
 */
window.qunitTestsArray.push({
    step:800,
    test:function()
    {
        syncQUnit.addTest('Список шаблонов', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"templates"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates');
                render(done)
            })
        });

        syncQUnit.addTest('Новый template/new-module', function ( assert )
        {
            var done = assert.async();

            // Открытие пункта меню new-project
            $.when(spajs.open({ menuId:"template/new-module"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-project');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-project');
                render(done)
            })
        });

        var t = new Date();
        t = t.getTime()

        syncQUnit.addTest('Сохранение не валидного шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            // Заполнение формы с данными project
            $("#Templates-name").val("test-template-"+t);

            jsonEditor.__devAddVar("new-vault-password-file2", "syntax-check")

            // Отправка формы с данными project
            $.when(pmModuleTemplates.addItem()).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно template add Item, а не должно было');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при template add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("new-vault-password-file2")
            $("#new_json_nameprefix").val("new-vault-password-file");
            $("#new_json_valueprefix").val("syntax-check");
            jsonEditor.jsonEditorAddVar();

            $("#inventories-autocomplete").val($("#inventories-autocomplete option")[0].value).trigger('change.select2');


            // Заполнение формы с данными project
            $("#Templates-name").val("test-template-"+t);

            // Отправка формы с данными project
            $.when(pmModuleTemplates.addItem()).done(function()
            {
                assert.ok(true, 'Успешно template add Item');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при template add Item');
                render(done)
            })
        });

        //начало тестирования опций шаблона
        var itemIdForOptionTest1=undefined;

        syncQUnit.addTest('Открытие страницы списка опций шаблона модуля', function ( assert )
        {
            var done = assert.async();
            itemIdForOptionTest1 = /template\/Module\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForOptionTest1+"/options"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Module/item_id/options');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Module/item_id/options');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие страницы создания новой опции шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForOptionTest1+"/new-option"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Module/item_id/new-option');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Module/item_id/new-option');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение  новой невалидной опции шаблона модуля', function ( assert )
        {
            var done = assert.async();

            //пытаемся сохранить пустую опцию, даже не забав имя
            $.when(pmModuleTemplates.saveNewOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(false, 'Опция успешно сохранена, а не должна была');
                debugger;
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении опции, что и ожидалось');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой невалидной опции шаблона модуля 2', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            $("#filed_option_name").val("test-option");

            //пытаемся сохранить пустую опцию, с именем, но идентичную шаблону
            $.when(pmModuleTemplates.saveOption(itemIdForOptionTest1)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно сохранено, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение новой валидной опции шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу опции
            var done = assert.async();

            jsonEditor.jsonEditorRmVar('new-vault-password-file', 'prefix');
            jsonEditor.jsonEditorRmVar("become2")
            $("#new_json_nameprefix").val("become");
            jsonEditor.jsonEditorAddVar();

            $.when(pmModuleTemplates.saveNewOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(true, 'Опция успешно сохранена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении опции');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение опции шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу создания project
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("check2")
            $("#new_json_nameprefix").val("check");
            jsonEditor.jsonEditorAddVar();

            $.when(pmModuleTemplates.saveOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(true, 'Опция успешно изменена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при изменении опции');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение и запуск опции шаблона модуля', function ( assert )
        {
            // Предполагается что мы от прошлого теста попали на страницу просмотра/редактирования опции шаблона
            var done = assert.async();

            $.when(pmModuleTemplates.saveAndExecuteOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(true, 'Опция успешно сохранена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении опции');
                render(done)
            })
        });

        //открываем страницу создания новой опции для дальнейших тестов
        syncQUnit.addTest('Открытие страницы создания новой опции шаблона модуля', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForOptionTest1+"/new-option"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Module/item_id/new-option');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Module/item_id/new-option');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение  опции шаблона модуля с уже существующем именем', function ( assert )
        {
            var done = assert.async();

            jsonEditor.jsonEditorRmVar("become2")
            $("#new_json_nameprefix").val("become");
            jsonEditor.jsonEditorAddVar();
            $("#filed_option_name").val("test-option");

            $.when(pmModuleTemplates.saveNewOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(false, 'Опция успешно сохранена, а не должна была');
                debugger;
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при сохранении опции, что и ожидалось');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение опции шаблона модуля с новым именем', function ( assert )
        {
            var done = assert.async();

            $("#filed_option_name").val("test-option2");

            $.when(pmModuleTemplates.saveNewOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(true, 'Опция успешно сохранена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при сохранении опции');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление опции шаблона модуля', function ( assert )
        {
            var done = assert.async();

            $.when(pmModuleTemplates.removeOption(itemIdForOptionTest1)).done(function()
            {
                assert.ok(true, 'Опция успешно удалена');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при удалении опции');
                render(done)
            })
        });
        //конец тестирования опции шаблона

        //начинаем тестирование переодических тасок через шаблоны
        var itemIdForPT1 = undefined;
        syncQUnit.addTest('Открытие страницы списка периодических тасок шаблона модуля', function ( assert )
        {
            var done = assert.async();
            itemIdForPT1 = /template\/Module\/([0-9]+)/.exec(window.location.href)[1];

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForPT1+"/periodic-tasks"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Module/item_id/periodic-tasks');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Module/item_id/periodic-tasks');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие страницы создания новой периодической таски шаблона Module', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForPT1+"/new-periodic-task"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню templates/Module/item_id/new-periodic-task');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню templates/Module/item_id/new-periodic-task');
                render(done)
            })
        });


        syncQUnit.addTest('Создание новой периодической таски шаблона Module', function ( assert )
        {
            var done = assert.async();

            $("#new_periodic-tasks_name").val("new-pt");
            $("#new_periodic-tasks_schedule_INTERVAL").val(60);

            var project_id = pmModuleTemplates.model.items[itemIdForPT1].data.project;

            $.when(pmPeriodicTasks.addItem(project_id)).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно создана');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании periodic task for template');
                render(done)
            })
        });


        syncQUnit.addTest('Изменение периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            var project_id = pmModuleTemplates.model.items[itemIdForPT1].data.project;
            var pt_id = /template\/Module\/([0-9]+)\/periodic-task\/([0-9]+)/.exec(window.location.href)[2];
            $("#periodic-tasks_"+pt_id+"_schedule_INTERVAL").val(3600);

            $.when(pmPeriodicTasks.updateItem(pt_id, {project_id:project_id})).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно изменена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при изменении periodic task for template');
                render(done)
            })
        });


        syncQUnit.addTest('Удаление периодической таски шаблона задачи', function ( assert )
        {
            var done = assert.async();

            var pt_id = /template\/Module\/([0-9]+)\/periodic-task\/([0-9]+)/.exec(window.location.href)[2];

            $.when(pmPeriodicTasks.deleteItem(pt_id, true)).done(function()
            {
                assert.ok(true, 'Periodic task for template была успешно удалена');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при удалении periodic task for template');
                render(done)
            })
        });
        //конец тестирования переодических тасок через шаблоны

        syncQUnit.addTest('Открытие страницы шаблона модуля', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/"+itemIdForPT1})).done(function()
            {
                assert.ok(true, 'Успешно открыт шаблон');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при открытии шаблона');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение не валидного шаблона модуля', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования project
            // с адресом http://192.168.0.12:8080/?group-5
            var itemId = /template\/Module\/([0-9]+)/.exec(window.location.href)[1]

            $("#module-autocomplete").val("test2-playbook-"+t);
            jsonEditor.__devAddVar("new-vault-password-file2", "syntax-check")


            $.when(pmModuleTemplates.updateItem(itemId)).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно update add Item, а не должно было');
                render(done)
            }).fail(function(){
                assert.ok(true, 'Ошибка при update add Item, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение шаблона модуля', function ( assert )
        {
            var done = assert.async();

            var itemId = /template\/Module\/([0-9]+)/.exec(window.location.href)[1]

            jsonEditor.jsonEditorRmVar("new-vault-password-file2")
            $("#module-autocomplete").val("test2-playbook-"+t);

            $("#new_json_nameprefix").val("new-vault-password-file");
            $("#new_json_valueprefix").val("syntax-check");
            jsonEditor.jsonEditorAddVar();

            $.when(pmModuleTemplates.updateItem(itemId)).done(function()
            {
                assert.ok(true, 'Успешно update add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при update add Item');
                render(done)
            })
        });

        var itemId = undefined
        syncQUnit.addTest('Копирование template Module', function ( assert )
        {
            itemId = /template\/Module\/([0-9]+)/.exec(window.location.href)[1]

            var done = assert.async();
            $.when(pmModuleTemplates.copyAndEdit(itemId)).done(function()
            {
                assert.ok(true, 'Успешно copyAndEdit add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при copyAndEdit add Item');
                render(done)
            })
        });
        /*
    syncQUnit.addTest('Выполнение template Module', function ( assert )
    {
        var itemId = /template\/Module\/([0-9]+)/.exec(window.location.href)[1]
        debugger;
        var done = assert.async();
        $.when(pmModuleTemplates.execute(itemId)).done(function()
        {
            assert.ok(true, 'Успешно pmModuleTemplates.execute');
            render(done)
        }).fail(function(){
            assert.ok(false, 'Ошибка при pmModuleTemplates.execute');
            render(done)
        })
    });*/

        syncQUnit.addTest('pmTemplates.exportToFile', function ( assert )
        {
            var done = assert.async();

            $.when(pmTemplates.exportToFile([itemId])).done(function()
            {
                assert.ok(true, 'pmTemplates.exportToFile ok');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'pmTemplates.exportToFile error');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление копии template Module', function ( assert )
        {
            var done = assert.async();

            // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
            // с адресом http://192.168.0.12:8080/?user-5
            var itemId = /template\/Module\/([0-9]+)/.exec(window.location.href)[1]

            // Удаление пользователя.
            $.when(pmModuleTemplates.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete add Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при delete add Item');
                render(done)
            })
        });

        // syncQUnit.addTest('Сохранение и запуск шаблона Module', function ( assert )
        // {
        //     var done = assert.async();
        //
        //     $.when(spajs.open({ menuId:"template/Module/"+itemId})).done(function()
        //     {
        //         $.when(pmModuleTemplates.saveAndExecute(itemId)).done(function()
        //         {
        //             assert.ok(true, 'Успешно pmModuleTemplates.saveAndExecute');
        //             render(done)
        //         }).fail(function(){
        //             debugger;
        //             assert.ok(false, 'Ошибка при pmModuleTemplates.saveAndExecute');
        //             render(done)
        //         })
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Ошибка при открытиии меню template/Module/'+itemId);
        //         render(done)
        //     })
        // });

        // var tt_history_id_1 = undefined;
        // syncQUnit.addTest('Страница списка Module template History', function ( assert )
        // {
        //
        //     tt_history_id_1=/history\/([0-9]+)/.exec(window.location.href)[1];
        //     var done = assert.async();
        //     $.when(spajs.open({ menuId:'template/Module/'+itemId+'/history'})).done(function()
        //     {
        //         assert.ok(true, 'Страница открылась');
        //         render(done)
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Страница не открылась');
        //         render(done)
        //     })
        // })
        //
        // syncQUnit.addTest('Страница Module template History Item', function ( assert )
        // {
        //     var done = assert.async();
        //     $.when(spajs.open({ menuId:'template/Module/'+itemId+'/history/'+tt_history_id_1})).done(function()
        //     {
        //         assert.ok(true, 'Страница открылась');
        //         render(done)
        //     }).fail(function()
        //     {
        //         debugger;
        //         assert.ok(false, 'Страница не открылась');
        //         render(done)
        //     })
        // })

        syncQUnit.addTest('Удаление шаблона', function ( assert )
        {
            var done = assert.async();

            // Удаление project.
            $.when(pmModuleTemplates.deleteItem(itemId, true)).done(function()
            {
                assert.ok(true, 'Успешно delete Item');
                render(done)
            }).fail(function(){
                debugger;
                assert.ok(false, 'Ошибка при delete Item');
                render(done)
            })
        });
    }})

/**
 * Тестирование pmDashboard
 */
window.qunitTestsArray.push({
    step:900,
    test:function()
    {

        syncQUnit.addTest('Страница dashboard', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"home"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню pmDashboard');

                setTimeout(function(){// Ждём завершения всех асинхронных запросов на странице

                    tabSignal.emit('guiLocalSettings.hideMenu', {type:'set', name:'hideMenu', value:false})
                    setTimeout(function()
                    {
                        render(done)
                    }, 500)
                }, 5000)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню pmDashboard');
                render(done)
            })
        });

    }})

/**
 * Тестирование поиска
 */
window.qunitTestsArray.push({
    step:1000,
    test:function()
    {

        syncQUnit.addTest('Поиск projects', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"projects/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/projects');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/projects');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск templates', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"templates/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/templates');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/templates');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск hosts', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"hosts/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/hosts');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/hosts');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск groups', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"groups/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/groups');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/groups');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск history', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"history/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/history');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/history');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск inventories', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventories/search/tar"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/inventories');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/inventories');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск users', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"users/search/admin"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню search/users');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню search/users');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск hooks', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"hooks/search/hook-example"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню hooks/search/hook-example');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню hooks/search/hook-example');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск task template options', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/9999999999/options/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Task/9999999999/options/search/name');
                render(done)
            }).fail(function()
            {

                assert.ok(true, 'Ошибка при открытиии меню template/Task/9999999999/options/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск task template periodic tasks', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/9999999999/periodic-tasks/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Task/9999999999/periodic-tasks/search/name');
                render(done)
            }).fail(function()
            {

                assert.ok(true, 'Ошибка при открытиии меню template/Task/9999999999/periodic-tasks/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск module template options', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/9999999999/options/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Module/9999999999/options/search/name');
                render(done)
            }).fail(function()
            {

                assert.ok(true, 'Ошибка при открытиии меню template/Module/9999999999/options/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Поиск module template periodic tasks', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/9999999999/periodic-tasks/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Module/9999999999/periodic-tasks/search/name');
                render(done)
            }).fail(function()
            {

                assert.ok(true, 'Ошибка при открытиии меню template/Module/9999999999/periodic-tasks/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в project history', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"project/9999999999/history"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню project/9999999999/history');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню project/9999999999/history');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в project history search', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"project/9999999999/history/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню project/9999999999/history/search/name');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню project/9999999999/history/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в project history search page', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"project/9999999999/history/search/name/page/1"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню project/9999999999/history/search/name/page/1');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню project/9999999999/history/search/name/page/1');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в inventory history', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventory/9999999999/history"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню inventory/9999999999/history');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню inventory/9999999999/history');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в inventory history search', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventory/9999999999/history/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню inventory/9999999999/history/search/name');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню inventory/9999999999/history/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в inventory history search page', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"inventory/9999999999/history/search/name/page/1"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню inventory/9999999999/history/search/name/page/1');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню inventory/9999999999/history/search/name/page/1');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в task template history search', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/9999999999/history/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Task/9999999999/history/search/name');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню template/Task/9999999999/history/search/name');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в module template history search', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/9999999999/history/search/name"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Module/9999999999/history/search/name');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню template/Module/9999999999/history/search/name');
                render(done)
            })
        });


        syncQUnit.addTest('Страница ошибки 400 в task template history search page', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Task/9999999999/history/search/name/page/1"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Task/9999999999/history/search/name/page/1');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню template/Task/9999999999/history/search/name/page/1');
                render(done)
            })
        });

        syncQUnit.addTest('Страница ошибки 400 в module template history search page', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"template/Module/9999999999/history/search/name/page/1"})).done(function()
            {
                debugger;
                assert.ok(false, 'Успешно открыто меню template/Module/9999999999/history/search/name/page/1');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при открытиии меню template/Module/9999999999/history/search/name/page/1');
                render(done)
            })
        });


    }})


/**
 * Тестирование history
 */
window.qunitTestsArray.push({
    step:1100,
    test:function()
    {
        syncQUnit.addTest('Страница history', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"history"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню history');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню history');
                render(done)
            })
        });


        syncQUnit.addTest('Страница history toggleSelectEachItem', function ( assert )
        {
            var done = assert.async();

            pmHistory.toggleSelectAll($('.multiple-select tr'), true);

            $.when(pmHistory.toggleSelectEachItem(true)).done(function()
            {
                assert.ok(true, 'ok:toggleSelectEachItem');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:toggleSelectEachItem');
                render(done)
            })
        })

        syncQUnit.addTest('Страница history toggleSelectEachItem', function ( assert )
        {
            var done = assert.async();

            pmHistory.toggleSelectAll($('.multiple-select tr'), false);

            $.when(pmHistory.toggleSelectEachItem(false)).done(function()
            {
                $.when(pmHistory.deleteSelected()).done(function()
                {
                    assert.ok(true, 'ok:deleteSelected');
                    render(done)
                }).fail(function()
                {
                    debugger;
                    assert.ok(false, 'error:deleteSelected');
                    render(done)
                })

            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:toggleSelectEachItem');
                render(done)
            })
        })

        syncQUnit.addTest('Страница history deleteRows', function ( assert )
        {
            var done = assert.async();

            $.when(pmHistory.deleteRows([])).done(function()
            {
                assert.ok(true, 'ok:deleteRows');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:deleteRows');
                render(done)
            })
        })

        syncQUnit.addTest('Страница history multiOperationsOnEachRow.loadItem', function ( assert )
        {
            var done = assert.async();

            $.when(pmHistory.multiOperationsOnEachRow([], 'loadItem', true)).done(function()
            {
                assert.ok(true, 'ok:multiOperationsOnEachRow.loadItem');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'error:multiOperationsOnEachRow.loadItem');
                render(done)
            })
        })

        syncQUnit.addTest('Страница history 2', function ( assert )
        {
            var done = assert.async();

            if(!pmHistory.model.itemslist.results.length)
            {
                assert.ok(true, 'Нет истории.');
                render(done)
            }

            $.when(spajs.open({ menuId:"history/"+pmHistory.model.itemslist.results[0].id})).done(function()
            {
                assert.ok(true, 'Успешно открыта страница history');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии страницы '+pmHistory.model.itemslist.results[0].id+' history');
                render(done)
            })
        });

        syncQUnit.addTest('cancelTask не существуещей таски', function ( assert )
        {
            var done = assert.async();

            $.when(pmHistory.cancelTask(99999)).done(function()
            {
                debugger;
                assert.ok(false, 'cancelTask выполнилось');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка cancelTask');
                render(done)
            })
        });

    }})


/**
 * Тестирование hooks
 */
window.qunitTestsArray.push({
    step:1200,
    test:function()
    {
        syncQUnit.addTest('Страница hooks', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"hooks"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню hooks');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню hooks');
                render(done)
            })
        });

        syncQUnit.addTest('Открытие cтраницы new hook', function ( assert )
        {
            var done = assert.async();

            $.when(spajs.open({ menuId:"new-hook"})).done(function()
            {
                assert.ok(true, 'Успешно открыто меню new-hook');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при открытиии меню new-hook');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение невалидного hook', function ( assert )
        {
            var done = assert.async();

            $.when(pmHooks.addItem()).done(function()
            {
                debugger;
                assert.ok(false, 'Хук успешно сохранен, а не должен был');
                render(done)
            }).fail(function()
            {
                assert.ok(true, 'Ошибка при сохранении хука, как и задумано');
                render(done)
            })
        });

        syncQUnit.addTest('Сохранение валидного hook', function ( assert )
        {
            var done = assert.async();

            $('#filed_name').val('test-hook');
            pmHooks.model.newItem.recipients='test-recipient';

            $.when(pmHooks.addItem()).done(function()
            {
                assert.ok(true, 'Hook успешно создан');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при создании hook');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение имени hook', function ( assert )
        {
            var done = assert.async();
            var item_id=/hook\/([0-9]+)/.exec(window.location.href)[1]

            $('#filed_name').val('test-hook2');

            $.when(pmHooks.updateItem(item_id)).done(function()
            {
                assert.ok(true, 'Hook успешно изменен');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при изменении hook');
                render(done)
            })
        });

        syncQUnit.addTest('Изменение when hook на null', function ( assert )
        {
            var done = assert.async();
            var item_id=/hook\/([0-9]+)/.exec(window.location.href)[1]

            $('#hook-'+item_id+'-when').val('null');

            $.when(pmHooks.updateItem(item_id)).done(function()
            {
                assert.ok(true, 'Hook успешно изменен');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при изменении hook');
                render(done)
            })
        });

        syncQUnit.addTest('Деактивация hook', function ( assert )
        {
            var done = assert.async();
            var item_id=/hook\/([0-9]+)/.exec(window.location.href)[1]

            $.when(pmHooks.changeItemActivation(item_id)).done(function()
            {
                assert.ok(true, 'Hook успешно деативирован');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при деактивации hook');
                render(done)
            })
        });

        syncQUnit.addTest('Удаление  hook', function ( assert )
        {
            var done = assert.async();
            var item_id=/hook\/([0-9]+)/.exec(window.location.href)[1]

            $('#filed_name').val('test-hook2');

            $.when(pmHooks.deleteItem(item_id, true)).done(function()
            {
                assert.ok(true, 'Hook успешно удален');
                render(done)
            }).fail(function()
            {
                debugger;
                assert.ok(false, 'Ошибка при удалении hook');
                render(done)
            })
        });

    }})