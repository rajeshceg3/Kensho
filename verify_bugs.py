from playwright.sync_api import sync_playwright

def verify_bugs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # 1. Check initial timer display
        timer_display = page.locator("#timer-display")
        initial_text = timer_display.text_content()
        print(f"Initial Timer Display: '{initial_text}'")

        # 2. Check Settings Menu Focus Trap
        settings_button = page.locator("#settings-button")
        settings_button.click()

        # Check if settings menu is active
        settings_menu = page.locator("#settings-menu")
        is_active = settings_menu.get_attribute("class")
        print(f"Settings Menu Class: '{is_active}'")

        # Try to tab out
        # We can't easily simulate "tabbing out" and checking focus in headless easily without complex steps,
        # but we can check if there are focus listeners or if the implementation handles it.
        # For now, let's just take a screenshot of the open menu.
        page.screenshot(path="bug_report_1.png")

        # 3. Check Escape key
        page.keyboard.press("Escape")
        # Check if menu is closed (class active removed)
        # Note: transitions take time.
        page.wait_for_timeout(500)
        is_active_after_esc = settings_menu.get_attribute("class")
        print(f"Settings Menu Class after Escape: '{is_active_after_esc}'")

        browser.close()

if __name__ == "__main__":
    verify_bugs()
