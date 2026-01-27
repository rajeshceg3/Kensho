
from playwright.sync_api import sync_playwright
import time

def verify_inert_click():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Open settings
        page.locator("#settings-button").click()
        time.sleep(0.5)

        # Confirm menu is open
        if "active" not in page.locator("#settings-menu").get_attribute("class"):
            print("Setup Failed: Menu not open")
            return

        print("Menu Open. Clicking 'background' (Start Button area)...")
        # Click on start button (which is inside main, which is inert)
        # We use force=True because playwright might complain it's not actionable?
        # Actually, let's just click coordinates outside the menu.
        page.mouse.click(100, 300)

        time.sleep(0.5)

        # Check if menu is still open
        if "active" in page.locator("#settings-menu").get_attribute("class"):
            print("FAIL: Menu remained open after clicking background (Inert blocked the click)")
        else:
            print("PASS: Menu closed.")

if __name__ == "__main__":
    verify_inert_click()
