/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */

///////////////////////////////////////////////
// Вспомагательные функции для тестирования
///////////////////////////////////////////////

function render(name, time, callback)
{
    var def = new $.Deferred();

    if(!time)
    {
        time = 10
    }

    setTimeout(function(name){
        console.log("render " + name)
        setTimeout(function(){

            if(callback)
            {
                callback(name)
            }

            def.resolve()
        }, 10)
    }, time, name, 0)

    return def.promise();
}

function saveReport()
{
    console.log("saveReport")
}

/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}

/**
 * Вставляет Qunit и запускает выполнение тестов.
 */
function injectQunit()
{
    $("body").append('<link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.2.1.css">')
    $("body").append('<script src="https://code.jquery.com/qunit/qunit-2.2.1.js"></script>')
    $("body").append('<div id="qunit"></div><div id="qunit-fixture"></div>')

    var intervalId = setInterval(function()
    {
        if(!window.QUnit)
        {
            return;
        }

        console.log("Начинаем тесты от Qunit");
        clearInterval(intervalId)

        QUnit.test('trim()', function ( assert ) {
            var done = assert.async();
            assert.equal(trim(''), '', 'Пустая строка');
            assert.ok(trim('   ') === '', 'Строка из пробельных символов');
            assert.equal(trim(), '', 'Без параметра');

            assert.equal(trim(' x'), 'x', 'Начальные пробелы');
            assert.equal(trim('x '), 'x', 'Концевые пробелы');
            assert.equal(trim(' x '), 'x', 'Пробелы с обоих концов');
            assert.equal(trim('    x  '), 'x', 'Табы');
            assert.equal(trim('    x   y  '), 'x   y', 'Табы и пробелы внутри строки не трогаем');

            done();
        });

        qunitTests()

        QUnit.done(function( details ) {
          console.log( "Total: "+ details.total+ " Failed: "+ details.failed+ " Passed: "+ details.passed+ " Runtime: "+ details.runtime );
          render("ok-done", 0, window.close)
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

            console.log( JSON.stringify( result, null, 2 ) );
            saveReport()
        })
    }, 500)
}


///////////////////////////////////////////////
// Функции тестирования
///////////////////////////////////////////////


function startTest()
{
    if(window.phantomjs_step === undefined)
    {
        setTimeout(startTest, 300)
        return;
    }

    console.log("ready: " + window.location.href);
    if(window.location.pathname === "/")
    {
        if(window.phantomjs_step < 2)
        {
            console.log("Тест формы авторизации завален [3]");
            window.close()
        }

        console.log("Тест формы авторизации шаг 2");
        jQuery.ajax({
            url: "/api/v1/users/",
            type: "GET",
            contentType:'application/json',
            data: "",
            beforeSend: function(xhr, settings) {
                if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                }
            },
            success: function(data)
            {
                console.log("Тест формы авторизации пройден");
                injectQunit();
                //window.close()
            },
            error:function(e)
            {
                console.log("Тест формы авторизации завален [2]");
                window.close()
            }
        });
    }
    else
    {
        console.log("Тест формы авторизации, window.phantomjs_step = " + window.phantomjs_step);
        render("authTest-"+window.phantomjs_step)
        if(window.phantomjs_step == 1)
        {
            // Тест формы авторизации
            $("#username").val('admin')
            $("#password").val('nopassword')
            $(".form-signin").submit()
        }
        else if(window.phantomjs_step == 2)
        {
            // Тест формы авторизации
            $("#username").val('admin')
            $("#password").val('admin')
            $(".form-signin").submit()
        }
        else if(window.phantomjs_step > 2)
        {
            console.log("Тест формы авторизации завален [1]");
            window.close()
        }
    }
}

/**
 * В этой функции должны быть qunit тесты для приложения
 */
function qunitTests()
{
    QUnit.test('users', function ( assert ) {
        var done = assert.async();

        // Открытие пункта меню users
        $.when(spajs.open({ menuId:"users"})).done(function()
        {
            assert.ok(true, 'Успешно открыто меню users');
            $.when(render("users", 1000)).always(function()
            {
                // Открытие пункта меню new-user
                $.when(spajs.open({ menuId:"new-user"})).done(function()
                {
                    assert.ok(true, 'Успешно открыто меню new-user');

                    // Открытие пункта меню new-user
                    $.when(render("users-new-user", 1000)).always(function()
                    {
                        var t = new Date();
                        t = t.getTime()
                        // Заполнение формы с данными пользователя
                        $("#new_user_username").val("test-user-"+t);
                        $("#new_user_password").val("test-user-"+t);
                        $("#new_user_email").val("test@user.ru");
                        $("#new_user_first_name").val("test");
                        $("#new_user_last_name").val("user");

                        // Отправка формы с данными пользователя
                        $.when(pmUsers.addItem()).done(function(){
                            assert.ok(true, 'Успешно user add Item');

                            $.when(render("users-add-new-user", 1000)).always(function()
                            {
                                // Предполагается что мы от прошлого теста попали на страницу редактирования пользователя
                                // с адресом http://192.168.0.12:8080/?spa=user-5
                                var userId = /user-([0-9]+)/.exec(window.location.href)[1]

                                $("#user_"+userId+"_username").val("test2-user-"+t);
                                $("#user_"+userId+"_password").val("test2-user-"+t);
                                $("#user_"+userId+"_email").val("test2@user.ru");
                                $("#user_"+userId+"_first_name").val("test2-"+t);
                                $("#user_"+userId+"_last_name").val("user2-"+t);

                                $.when(pmUsers.updateItem(userId)).done(function()
                                {
                                    assert.ok(true, 'Успешно update add Item');

                                    $.when(render("users-update-user", 1000)).always(function()
                                    {
                                        // Удаление пользователя.
                                        $.when(pmUsers.deleteItem(userId, true)).done(function(){
                                            assert.ok(true, 'Успешно delete add Item');
                                            render("users-delete-user", 1000, done)
                                        }).fail(function(){
                                            assert.ok(false, 'Ошибка при delete add Item');
                                            render("users-delete-user", 1000, done)
                                        })
                                    })
                                }).fail(function(){
                                    assert.ok(false, 'Ошибка при update add Item');
                                    render("users-update-user", 1000, done)
                                })
                            })
                        }).fail(function(){
                            assert.ok(false, 'Ошибка при user add Item');
                            render("users-add-new-user", 1000, done)
                        })
                    })
                }).fail(function(){
                    assert.ok(false, 'Ошибка при открытиии меню new-user');
                    render("users-new-user", 1000, done)
                })
            })
        }).fail(function(){
            assert.ok(false, 'Ошибка при открытиии меню users');
            render("users", 1000, done)
        })
    });
}


$(document).ready(function()
{
    startTest()
})