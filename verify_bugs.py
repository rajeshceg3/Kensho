
from playwright.sync_api import sync_playwright

def verify_bugs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # 1. Check title
        print(f"Title: {page.title()}")
        assert "Kenshō" in page.title()

        # 2. Check accessibility of pool-container
        pool = page.locator("#pool-container")
        print(f"Pool role: {pool.get_attribute('role')}")
        print(f"Pool tabindex: {pool.get_attribute('tabindex')}")

        # 3. Check for settings menu visibility and interaction
        settings_btn = page.locator("#settings-button")
        settings_btn.click()

        # Wait for transition
        page.wait_for_timeout(500)

        menu = page.locator("#settings-menu")
        if menu.is_visible():
            print("Settings menu opened.")
        else:
            print("Settings menu failed to open.")

        # 4. Check Focus Trap
        # Tab into the menu
        page.keyboard.press("Tab")
        focused = page.evaluate("document.activeElement.id")
        # First element might be 'settings-title' (if focusable?) or first button.
        # Looking at HTML, first focusable is likely 'time-options' children.
        # Actually logic says 'firstElement.focus()'.

        # Let's see what is focused.
        # The app logic says: settingsMenu.focus().
        # Then handleTrapFocus should keep it inside.

        # Let's traverse all buttons.
        focusable_count = menu.locator("button").count()
        print(f"Focusable elements in menu: {focusable_count}")

        for i in range(focusable_count):
            page.keyboard.press("Tab")

        # After cycling through, next tab should go back to first.
        page.keyboard.press("Tab")
        # Verify we are still in menu
        focused_element = page.evaluate("document.activeElement")
        is_inside = page.evaluate("document.getElementById('settings-menu').contains(document.activeElement)")
        if is_inside:
            print("Focus Trap: PASS (Focus remained inside menu)")
        else:
            print("Focus Trap: FAIL (Focus escaped menu)")

        # 5. Check Escape key
        page.keyboard.press("Escape")
        # Wait for transition
        page.wait_for_timeout(500)
        if not menu.is_visible():
            print("Escape Key: PASS (Menu closed)")
        else:
            print("Escape Key: FAIL (Menu remained open)")

        browser.close()

if __name__ == "__main__":
    verify_bugs()
