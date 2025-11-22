#!/usr/bin/env python3
"""
Test Script: Verify RoleNotificationsModal logs and functionality
Purpose: Open Detail Manager notification settings and verify new debug logs
"""

from playwright.sync_api import sync_playwright
import time

# Store console logs
console_logs = []

def on_console(msg):
    """Capture console logs"""
    # Filter for our debug logs
    text = msg.text
    if any(keyword in text for keyword in [
        '[RoleNotificationsModal]',
        '[useRoleNotificationEvents]',
        '[DealerRoles]'
    ]):
        console_logs.append(f"{msg.type.upper()}: {text}")
        print(f"[LOG] {msg.type.upper()}: {text}")

with sync_playwright() as p:
    print("\n[*] Starting browser...")
    browser = p.chromium.launch(headless=False)  # Not headless to see what's happening
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080}
    )
    page = context.new_page()

    # Listen to console
    page.on('console', on_console)

    print("[*] Navigating to application...")
    page.goto('http://localhost:8080', wait_until='networkidle')

    # Wait for app to load
    print("[*] Waiting for app to be ready...")
    time.sleep(3)

    # Take initial screenshot
    page.screenshot(path='screenshots/01-initial-page.png', full_page=True)
    print("[*] Screenshot saved: 01-initial-page.png")

    # Navigate to Administration/Roles
    print("\n[*] Looking for Administration menu...")

    try:
        # Click on Administration in sidebar
        admin_link = page.locator('text=Administration').first
        if admin_link.is_visible():
            print("✅ Found Administration link")
            admin_link.click()
            time.sleep(1)
            page.screenshot(path='screenshots/02-after-admin-click.png', full_page=True)
        else:
            print("⚠️  Administration link not immediately visible, trying to find it...")

        # Wait for page load
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Check URL
        current_url = page.url
        print(f"📍 Current URL: {current_url}")

        # Look for roles or settings that might contain roles
        print("\n🔍 Looking for roles list...")

        # Try to find any role cards or list
        role_elements = page.locator('[class*="role"]').all()
        print(f"Found {len(role_elements)} elements with 'role' in class")

        # Take screenshot of current state
        page.screenshot(path='screenshots/03-searching-roles.png', full_page=True)
        print("📸 Screenshot saved: 03-searching-roles.png")

        # Look specifically for "Detail Manager" text
        detail_manager = page.locator('text=Detail Manager').first
        if detail_manager.is_visible():
            print("✅ Found Detail Manager role")

            # Find the notification button (Bell icon) near Detail Manager
            # Look for button with Bell icon
            notification_button = page.locator('[title*="notification" i], [title*="SMS" i]').first

            if notification_button.is_visible():
                print("✅ Found notification button")
                print("🔔 Clicking notification button...")

                # Clear previous logs
                console_logs.clear()

                # Click the button
                notification_button.click()

                # Wait for modal to appear
                time.sleep(2)

                # Take screenshot of modal
                page.screenshot(path='screenshots/04-notifications-modal-open.png', full_page=True)
                print("📸 Screenshot saved: 04-notifications-modal-open.png")

                # Print captured console logs
                print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                print("📋 CONSOLE LOGS CAPTURED:")
                print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                for log in console_logs:
                    print(log)

                if len(console_logs) == 0:
                    print("⚠️  No debug logs captured - check if logs are being filtered")

                # Check modal content
                modal_visible = page.locator('[role="dialog"]').is_visible()
                if modal_visible:
                    print("\n✅ Modal is visible")

                    # Check for "0 of 10 events enabled" text
                    stats_text = page.locator('text=/\\d+ of \\d+ events enabled/').all()
                    print(f"📊 Found {len(stats_text)} module stats")
                    for stat in stats_text:
                        print(f"   - {stat.text_content()}")
                else:
                    print("❌ Modal not visible")

                # Wait a bit to see the modal
                print("\n⏳ Modal open, waiting 5 seconds...")
                time.sleep(5)

                # Take final screenshot
                page.screenshot(path='screenshots/05-final-state.png', full_page=True)
                print("📸 Screenshot saved: 05-final-state.png")

            else:
                print("❌ Notification button not found")
                # Try to find all buttons
                all_buttons = page.locator('button').all()
                print(f"Found {len(all_buttons)} total buttons on page")
        else:
            print("❌ Detail Manager role not found")
            # Print page content for debugging
            print("\n📄 Page text content:")
            print(page.text_content('body')[:500])

    except Exception as e:
        print(f"❌ Error during test: {e}")
        page.screenshot(path='screenshots/error-state.png', full_page=True)

    print("\n✅ Test complete. Browser will close in 3 seconds...")
    time.sleep(3)

    browser.close()

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 SUMMARY")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Total console logs captured: {len(console_logs)}")
    print("\nCheck screenshots/ directory for visual verification")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
