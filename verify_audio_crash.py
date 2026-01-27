
from playwright.sync_api import sync_playwright
import time

def verify_audio_crash():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Route audio to fail to trigger error handling immediately
        page.route("**/*.mp3", lambda route: route.abort())

        errors = []
        page.on("pageerror", lambda err: errors.append(err))
        page.on("console", lambda msg: errors.append(msg) if msg.type == "error" else None)

        try:
            page.goto("http://localhost:8000")
            time.sleep(2) # Wait for execution

            # Check if event listeners are attached by trying to toggle settings
            # If JS crashed, this button won't work (menu won't appear)
            page.locator("#settings-button").click(timeout=2000)

            if page.locator("#settings-menu").is_visible():
                print("UI Interactive (No Crash)")
            else:
                print("UI Not Interactive (Likely Crash)")

        except Exception as e:
            print(f"Interaction failed: {e}")

        if errors:
            print("\nErrors detected:")
            for e in errors:
                print(e)
            print("CRASH CONFIRMED" if any("ReferenceError" in str(e) for e in errors) else "Other Errors")

if __name__ == "__main__":
    verify_audio_crash()
