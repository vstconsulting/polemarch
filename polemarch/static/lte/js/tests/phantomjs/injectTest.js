/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */


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
            url: "/api/v1/services/",
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


function render(name, callback, time)
{
    if(time > 0)
    {
        return setTimeout(render, time, name, callback, 0)
    }
    console.log("render "+name)

    if(callback)
    {
        setTimeout(callback, 10, name)
    }
}

function saveReport()
{
    console.log("saveReport")
}
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}

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
        qunitTests()
    }, 500)
}


function qunitTests()
{
    QUnit.test('trim()', function ( assert ) {
        assert.equal(trim(''), '', 'Пустая строка');
        assert.ok(trim('   ') === '', 'Строка из пробельных символов');
        assert.equal(trim(), '', 'Без параметра');

        assert.equal(trim(' x'), 'x', 'Начальные пробелы');
        assert.equal(trim('x '), 'x', 'Концевые пробелы');
        assert.equal(trim(' x '), 'x', 'Пробелы с обоих концов');
        assert.equal(trim('    x  '), 'x', 'Табы');
        assert.equal(trim('    x   y  '), 'x   y', 'Табы и пробелы внутри строки не трогаем');

    });

    QUnit.test('dropDB', function (assert)
    {
        var done = assert.async();
        $.when(cloudDns.dropDB()).then(function(){
            assert.ok(true, 'dropDB ok');

            console.log('dropDB ok') 
            done();
        }).fail(function(){
            assert.ok(false, 'dropDB error');

            console.log('dropDB error')
            done();
        })
    })

    QUnit.test('Add default environment', function (assert)
    {
        var done = assert.async();

        render("ok-environments", function(){

            cloudDns.showNewEnvironmentForm('Default');

            // Добавление окружения Default
            $.when(cloudDns.addEnvironment('Default')).then(function()
            {
                assert.ok(false, 'Ошибка addEnvironment сработало без заполнения имени');
            }).fail(function()
            {
                assert.ok(true, 'addEnvironment не сработало без заполнения имени');
                var date = new Date()
                var environment_name = 'QUnit-test'+date.getTime()
                $("#new_environment_name").val(environment_name);

                console.log(JSON.stringify(cloudDns.environments))
                $.when(cloudDns.addEnvironment('Default')).then(function()
                {
                    assert.ok(true, 'Создан Environment - Default');
                    render("ok-new_environmentDefault")

                    // Проверка того что созданное окружение открывается
                    cloudDns.showEditEnvironmentForm(cloudDns.environments[0].id)
                    assert.ok($('#edit_environment_name').val() === environment_name, 'Имя для созданного окружения ' + $('#edit_environment_name').val() + " == " + environment_name + ' совпало')
                    render("ok-showEditEnvironmentForm")
                     
                    // Проверка того что созданное окружение удаляется
                    $.when(cloudDns.deleteEnvironment(cloudDns.environments[0].id, true)).then(function(){
                        assert.ok(true, 'Окружение удалено'); 
                        console.log("Окружение удалено");
                        done();
                    }).fail(function(res){
                        console.log('Ошибка при удалении окружения - ' + res);
                        assert.ok(false, 'Ошибка при удалении окружения - ' + res);
                        done();
                    })

                }).fail(function()
                {
                    console.log('Ошибка addEnvironment не сработало');
                    assert.ok(false, 'Ошибка addEnvironment не сработало');
                    // Возобновляем вручную
                    done();
                })
            })

            //cloudDns.showNewEnvironmentForm('OpenStack')
            //cloudDns.showNewEnvironmentForm('Amazon')
        })
    });

    QUnit.done(function( details ) {
      console.log( "Total: "+ details.total+ " Failed: "+ details.failed+ " Passed: "+ details.passed+ " Runtime: "+ details.runtime );
      render("ok-done", window.close)
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
}


$(document).ready(function()
{
    startTest()
})