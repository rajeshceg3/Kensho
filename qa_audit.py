
import time
from playwright.sync_api import sync_playwright

def run_audit():
    findings = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a standard desktop and a mobile device
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("--- Starting Audit ---")

        # 1. Load Page & Console Errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            page.goto("http://localhost:8000")
            print("[INFO] Page loaded.")
        except Exception as e:
            findings.append(f"[CRITICAL] Page load failed: {e}")
            return findings

        if console_errors:
            findings.append(f"[HIGH] Console errors detected on load: {console_errors}")

        # 2. Verify Title and Meta
        title = page.title()
        if "Kenshō" not in title:
            findings.append(f"[MEDIUM] Title incorrect: {title}")

        # 3. Dead Zone / Interaction Occlusion Test
        # We want to click on the controls container but NOT on a button, and see if the pool receives the click.
        # The pool click creates a ripple (div.ripple).

        # Reset any ripples
        page.evaluate("document.querySelectorAll('.ripple').forEach(el => el.remove())")

        # Find coordinates of a gap in controls.
        # Controls is centered. Buttons are stacked.
        # Let's try to click slightly above the Start button but within the controls div.
        controls_box = page.locator(".controls").bounding_box()
        start_btn_box = page.locator("#start-button").bounding_box()

        # Click 10px above the start button
        click_x = start_btn_box['x'] + start_btn_box['width'] / 2
        click_y = start_btn_box['y'] - 10

        # Perform click
        page.mouse.click(click_x, click_y)

        # Check for ripple
        # Wait a moment for ripple to be added to DOM
        time.sleep(0.2)
        ripple_count = page.locator(".ripple").count()

        if ripple_count > 0:
            print("[INFO] Dead Zone Test: PASSED (Click passed through to pool)")
        else:
            findings.append("[HIGH] Dead Zone Detected: Clicks on control gaps do not trigger pool interaction.")

        # 4. Persistence Test
        # Open Settings first
        page.locator("#settings-button").click()
        # Wait for animation
        time.sleep(1)

        # Change Theme to 'theme-sunrise'
        page.locator("[data-theme='theme-sunrise']").click()
        # Change Time to 25
        page.locator("[data-time='25']").click()

        # Reload
        page.reload()

        # Check if settings persisted
        body_class = page.evaluate("document.body.className")
        if "theme-sunrise" not in body_class:
            findings.append("[MEDIUM] Settings Persistence Failed: Theme did not persist.")

        selected_time = page.locator("#time-options .selected").get_attribute("data-time")
        if selected_time != "25":
            findings.append("[MEDIUM] Settings Persistence Failed: Time did not persist.")

        # 5. Accessibility & Interaction Logic
        settings_label = page.locator("#settings-button").get_attribute("aria-label")
        if not settings_label:
            findings.append("[MEDIUM] Accessibility: Settings button missing aria-label.")

        # Check if settings menu is modal-like (inert on main)
        # And check if clicking outside works (it shouldn't if inert is true on background)
        page.locator("#settings-button").click()
        time.sleep(0.5)
        is_inert = page.locator("main").get_attribute("inert")

        # Test: Click on Pool Surface while Settings Open
        # If inert works, this click should be ignored by the pool, AND might not trigger 'click' on document?
        # Actually, inert prevents events from firing on the element.
        # So clicking pool won't trigger the document click listener that closes the menu?

        # We click the pool
        pool_box = page.locator("#pool-surface").bounding_box()
        page.mouse.click(pool_box['x'] + 10, pool_box['y'] + 10)
        time.sleep(0.5)

        # Check if settings menu is still active
        is_active = "active" in page.locator("#settings-menu").get_attribute("class")

        if is_active:
             findings.append("[HIGH] UX: Cannot close Settings by clicking outside (likely due to inert attribute blocking interactions).")
        else:
             # If it closed, did we lose focus?
             # Or did we successfully click?
             pass

        if is_inert is None and is_inert != "":
             findings.append("[LOW] Accessibility: Main content not marked 'inert' when settings open.")

        # Restore state (Close settings if still open)
        if is_active:
            page.locator("#settings-button").click()

        # 6. Reduced Motion Verification
        # Open a new context with reduced motion enabled
        print("[INFO] Verifying Reduced Motion...")
        context_rm = browser.new_context(reduced_motion="reduce")
        page_rm = context_rm.new_page()
        page_rm.goto("http://localhost:8000")

        # Start timer
        page_rm.locator("#start-button").click()
        time.sleep(0.5)

        # Check pattern paths
        # They should have stroke-dashoffset = 0 (or close to 0 if logic says 0)
        # In my logic: path.style.strokeDashoffset = 0

        # Get one path
        offset = page_rm.evaluate("document.querySelector('#pattern-container path').style.strokeDashoffset")
        if offset == "0" or offset == "0px":
            print("[INFO] Reduced Motion: PASSED (Pattern fully revealed instantly)")
        else:
            findings.append(f"[MEDIUM] Reduced Motion Failed: StrokeDashOffset is {offset} (expected 0).")

        context_rm.close()

        # 7. Audio File Verification (Network)
        # We can't hear, but we can check if requests 404.
        # This requires capturing network requests or checking for failed loads.
        # We rely on previous console error check.

        # 7. Timer Logic
        # Close settings
        page.keyboard.press("Escape")
        time.sleep(0.5)

        # Start Timer
        page.locator("#start-button").click()

        # Check if 'timer-active' class is added
        if "timer-active" not in page.locator("#pool-container").get_attribute("class"):
             findings.append("[HIGH] Timer failed to start (UI state not updated).")

        # Wait 2 seconds
        time.sleep(2)

        # Check time decremented
        timer_text = page.locator("#timer-display").text_content()
        # Should be less than selected time (25:00)
        # e.g. 24:58 or 24:59
        if "25:00" in timer_text:
             findings.append("[HIGH] Timer not counting down.")

        # Reset
        page.locator("#reset-button").click()
        time.sleep(0.5)
        if "timer-active" in page.locator("#pool-container").get_attribute("class"):
             findings.append("[MEDIUM] Timer failed to reset (UI state).")

        print("--- Audit Complete ---")
        return findings

if __name__ == "__main__":
    results = run_audit()
    if results:
        print("Findings:")
        for f in results:
            print(f)
    else:
        print("No automated findings.")
