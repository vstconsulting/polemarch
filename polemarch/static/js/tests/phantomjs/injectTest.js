/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */

///////////////////////////////////////////////
// Вспомагательные функции для тестирования
///////////////////////////////////////////////

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
    
}


$(document).ready(function()
{
    startTest()
})