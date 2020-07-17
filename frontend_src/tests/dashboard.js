/**
 * File with tests for dashboard view.
 */

/**
 * Test for dashboard views.
 */
tests.runner.module('guiViews[dashboard]');

tests.runner.test("guiViews['dashboard'].open", async (assert) => {
    let url = '/';

    spa.utils.current_view._initLoadingPromise();

    if (url === app.application.$route.path) {
        spa.utils.current_view.setLoadingSuccessful();
    } else {
        app.application.$router.push({ path: url });
    }

    try {
        await spa.utils.current_view.promise;
        assert.ok(true);
    } catch (e) {
        console.warn(e);
        assert.ok(false);
    }
});
