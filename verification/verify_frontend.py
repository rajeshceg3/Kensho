
from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Simulate audio failure to prove the fix works
        page.route("**/*.mp3", lambda route: route.abort())

        page.goto("http://localhost:8000")

        # Wait a bit
        time.sleep(2)

        # Take screenshot of the main UI
        page.screenshot(path="verification/ui_resilience.png")
        print("Screenshot taken at verification/ui_resilience.png")

if __name__ == "__main__":
    verify_frontend()
