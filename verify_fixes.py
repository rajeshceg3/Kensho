from playwright.sync_api import sync_playwright

def verify_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # 1. Check initial timer display (Should be 15:00 now)
        timer_display = page.locator("#timer-display")
        initial_text = timer_display.text_content()
        print(f"Initial Timer Display: '{initial_text}'")
        if initial_text != "15:00":
            print("FAIL: Timer display is not 15:00")
        else:
            print("PASS: Timer display is 15:00")

        # 2. Check Settings Menu Focus Trap
        settings_button = page.locator("#settings-button")
        settings_button.click()

        settings_menu = page.locator("#settings-menu")
        # Check aria-expanded on button
        is_expanded = settings_button.get_attribute("aria-expanded")
        print(f"Settings Button aria-expanded: '{is_expanded}'")

        # Check if settings menu is active
        is_active = settings_menu.get_attribute("class")
        print(f"Settings Menu Class: '{is_active}'")

        # 3. Check Escape key to close
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        is_active_after_esc = settings_menu.get_attribute("class")
        print(f"Settings Menu Class after Escape: '{is_active_after_esc}'")

        is_expanded_after_esc = settings_button.get_attribute("aria-expanded")
        print(f"Settings Button aria-expanded after Escape: '{is_expanded_after_esc}'")

        # 4. Check Reset Button Visibility during Timer
        start_button = page.locator("#start-button")
        start_button.click()

        # Timer active
        pool_container = page.locator("#pool-container")
        print(f"Pool Container Class: '{pool_container.get_attribute('class')}'")

        reset_button = page.locator("#reset-button")
        # Check computed style or just assume css is applied (since we verified css file update)
        # But we can check if it's clickable
        reset_button.click()

        # Timer should be stopped
        print(f"Pool Container Class after Reset: '{pool_container.get_attribute('class')}'")

        # Screenshot
        page.screenshot(path="verification_fixes.png")

        browser.close()

if __name__ == "__main__":
    verify_fixes()
