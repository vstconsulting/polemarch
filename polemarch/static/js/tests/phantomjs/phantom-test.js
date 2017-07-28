/**
 * Файл иентеграционного тестирования через phantomjs
 *
 * Вызывается phantomjs phantom-test.js
 * Открывает страницу pageUrl и вставляет в неё скрипт injectTestFile
 * Скрипт injectTestFile тестирует страницу и звершает работу phantomjs
 * В консоле остаётся вывод с информацией о том что же происходило.
 *
 */
var injectTestFile = "injectTest.js"
var pageUrl = "http://172.16.1.20:8080"
var step = 0;

function printArgs() {
    var i, ilen;
    for (i = 0, ilen = arguments.length; i < ilen; ++i) {
        console.log("    arguments[" + i + "] = " + JSON.stringify(arguments[i]));
    }
    console.log("");
}

function saveReport(page) {
 
    var report = page.evaluate(function() {
        return $("#qunit").html();
    });

    var fs = require('fs');
    var content =  '<!DOCTYPE html>\
                    <html>\
                        <head>\
                            <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.2.1.css"> \
                            <style>#qunit-testresult-display{    float: none;} </style> \
                        </head>\
                        <body>\
                          <div id="qunit">'+report+'</div>\
                          <div id="qunit-fixture"></div> \
                        </body>\
                    </html>'

    try {
        fs.write("report/index.html", content, 'w');
    } catch(e) {
        console.log(e);
    }
}



var page = require('webpage').create();

page.viewportSize = { width: 800, height: 600 };

page.onInitialized = function() {
    console.log("page.onInitialized");
    printArgs.apply(this, arguments);
};

page.onResourceRequested = function (request) {
    console.log('Request ' + JSON.stringify(request, undefined, 4));
};

page.onLoadStarted = function() {
    console.log("page.onLoadStarted");
    printArgs.apply(this, arguments);
};/**/

page.onError = function (msg, trace) {
    console.log("page.onError");
    console.log(msg);
    trace.forEach(function(item) {
        console.log('  ', item.file, ':', item.line);
    });
};

page.onLoadFinished = function()
{
    console.log("\x1b[1;34monLoadFinished:\x1b[0m" + JSON.stringify(arguments));
    if(arguments[0] == "success")
    {
        console.log("\x1b[1;32m"+arguments[0] + " page load finished\x1b[0m");
    }
    else
    {
        console.log("\x1b[1;31m"+arguments[0] + " page load finished\x1b[0m");
    }

    step += 1
    page.evaluate(function(step)
    {
        window.phantomjs_step = step
        console.log("Set step " + step);
    }, step);

    //console.log(page.injectJs("../qunit/qunit-2.2.1.js") ? "\x1b[32mSuccess injected qunit.js file!\x1b[0m" : "\x1b[1;31mFail injected qunit file!\x1b[0m");
    //console.log(page.injectCss("../qunit/qunit-2.2.1.css") ? "\x1b[32mSuccess injected qunit.css file!\x1b[0m" : "\x1b[1;31mFail injected qunit file!\x1b[0m");
    console.log(page.injectJs(injectTestFile) ? "\x1b[32mSuccess injected test file!\x1b[0m" : "\x1b[1;31mFail injected test file!\x1b[0m");
};

page.onUrlChanged = function() {
    console.log("\x1b[1;33mChanged url to:\x1b[0m"+arguments[0]);
};

/*
page.onNavigationRequested = function() {
    console.log("page.onNavigationRequested");
    printArgs.apply(this, arguments);
};

page.onRepaintRequested = function() {
    console.log("page.onRepaintRequested");
    printArgs.apply(this, arguments);
};

page.onResourceReceived = function() {
    console.log("page.onResourceReceived");
    printArgs.apply(this, arguments);
};*/

page.onResourceRequested = function() {
    if(/\.[^\.]{1,4}$/mgi.test(arguments[0].url) || /GET data/mgi.test(arguments[0].url))
    {
      //  return;
    }
    console.log("\n"+arguments[0].method+ " " + arguments[0].url);
    if(arguments[0].postData)
    {
        console.log(arguments[0].postData +"\n"+"\n")
    }
    else
    {
        console.log("\n"+"\n")
    }
};

page.onClosing = function()
{
    saveReport(page);

    console.log("\x1b[1;33mPage closing from script\x1b[0m");
    //printArgs.apply(this, arguments);
    phantom.exit();
};

var countRender = 0;

// window.console.log(msg);
page.onConsoleMessage = function(msg)
{

    console.log("\x1b[1;34mConsole message:\x1b[0m" + JSON.stringify(arguments));
    if(/^render ([A-z0-9\-_]+)$/.test(arguments[0]))
    {
        countRender++;
        var name = arguments[0].replace(/^render ([A-z0-9\-_]+)$/, "$1.png")
        page.render("report/"+countRender+"_"+name);
        console.log("\x1b[1;34mRender:\x1b[0m" + name);
        return;
    }

    if(/^saveReport$/.test(arguments[0]))
    {
        saveReport(page);
    }
    var message = arguments[0]
    message = message.replace(/ReferenceError:/igm, "\x1b[1;31mReferenceError:\x1b[0m")
    message = message.replace(/TypeError:/igm, "\x1b[1;31mReferenceError:\x1b[0m")

    if(/ReferenceError:/igm.test(message))
    {
        //phantom.exit();
    }

    if(/TypeError:/igm.test(message))
    {
        //phantom.exit();
    }

    console.log("\x1b[1;34mConsole message:\x1b[0m" + message);
    //printArgs.apply(this, arguments);
};

// var confirmed = window.confirm(msg);
page.onConfirm = function() {
    console.log("page.onConfirm");
    printArgs.apply(this, arguments);
};

// var user_value = window.prompt(msg, default_value);
page.onPrompt = function() {
    console.log("page.onPrompt");
    printArgs.apply(this, arguments);
};

// window.alert(msg);
page.onAlert = function() {
    console.log("page.onAlert");
    printArgs.apply(this, arguments);
};

page.open(pageUrl, function(status) {
    if ( status !== "success" ) {
        console.log("Page not found!");
        phantom.exit();
    }
});
