/**
 * File with tests for dashboard view.
 */

/**
 * Test for dashboard views.
 */
window.qunitTestsArray['guiViews[dashboard]'] = {
    test: function() {
        syncQUnit.addTest("guiViews['dashboard'].open", function(assert) {
            let done = assert.async();
            let url = "/";
            let expectation = true;

            spa.utils.current_view._initLoadingPromise();

            if(url == app.application.$route.path) {
                spa.utils.current_view.setLoadingSuccessful();
            } else {
                app.application.$router.push({path: url});
            }

            let getTestResult = (result) => {
                assert.ok(result == expectation, "guiViews['dashboard'].opened");
                testdone(done);
            };

            spa.utils.current_view.promise.then(() => {
                getTestResult(true);
            }).catch(error => {
                getTestResult(false);
            });
        });
    },
};