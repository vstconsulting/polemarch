from time import sleep
from django.test import LiveServerTestCase, override_settings
from django.contrib.auth import get_user_model
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common import exceptions


class SeleniumTestCase(LiveServerTestCase):
    host = 'localhost'
    port = 8888

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        # options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--auto-open-devtools-for-tabs")
        self.selenium = webdriver.Chrome(options=options)
        self.selenium.set_window_size(1280, 3240)
        super(SeleniumTestCase, self).setUp()

    def tearDown(self):
        self.selenium.save_screenshot('test_screenshot.png')
        self.selenium.quit()
        super(SeleniumTestCase, self).tearDown()

    @override_settings(DEBUG=True)
    def test_qunit(self):
        selenium = self.selenium
        # Opening the link we want to test
        selenium.get('http://localhost:8888/')
        login = selenium.find_element_by_name('username')
        login.send_keys('admin')
        password = selenium.find_element_by_name('password')
        password.send_keys('admin')
        submit = selenium.find_element_by_id('login_button')
        submit.send_keys(Keys.RETURN)
        trys = 40
        for i in range(trys):
            try:
                selenium.execute_script('window.loadQUnitTests()')
                trys = 300
                break
            except exceptions.WebDriverException:
                log_data = selenium.get_log('browser')
                if log_data:
                    print(log_data)
                sleep(1)
                trys -= 1
            finally:
                self.assertTrue(trys > 0, trys)
        saveReportObj = None
        for _ in range(900):
            try:
                saveReportObj = selenium.find_element_by_id('qunit-saveReport')
            except exceptions.NoSuchElementException:
                log_data = selenium.get_log('browser')
                if log_data:
                    print(log_data)
                sleep(1)
            else:
                break
        self.assertNotEqual(saveReportObj, None)
