/**
 * Файл вставляемый на страницу при тестировании из phantomjs
 */
   
///////////////////////////////////////////////
// Функции тестирования
///////////////////////////////////////////////
   
/**
 * Тестирование crontabEditor
 */
window.qunitTestsArray['crontabEditor'] = { 
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

            testdone(done)
        });
    }
} 
 
 