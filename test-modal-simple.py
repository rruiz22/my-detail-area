#!/usr/bin/env python3
"""Test: Verify RoleNotificationsModal logs"""

from playwright.sync_api import sync_playwright
import time

console_logs = []

def on_console(msg):
    text = msg.text
    if any(kw in text for kw in ['[RoleNotificationsModal]', '[useRoleNotificationEvents]', '[DealerRoles]']):
        console_logs.append(f"{msg.type.upper()}: {text}")
        print(f"[LOG] {msg.type.upper()}: {text}")

with sync_playwright() as p:
    print("\n[*] Starting browser...")
    browser = p.chromium.launch(headless=False)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    page.on('console', on_console)

    print("[*] Navigating to http://localhost:8080...")
    page.goto('http://localhost:8080', wait_until='networkidle')
    time.sleep(3)

    page.screenshot(path='screenshots/01-initial.png')
    print("[*] Screenshot: 01-initial.png")

    # Try to find Administration link
    print("\n[*] Looking for Administration...")
    try:
        # Wait for sidebar to be visible
        page.wait_for_selector('nav', timeout=5000)

        # Try different ways to find Administration
        admin_selectors = [
            'a:has-text("Administration")',
            'text=Administration',
            '[href*="admin"]'
        ]

        admin_found = False
        for selector in admin_selectors:
            try:
                elem = page.locator(selector).first
                if elem.is_visible(timeout=2000):
                    print(f"[+] Found Administration using: {selector}")
                    elem.click()
                    admin_found = True
                    break
            except:
                continue

        if not admin_found:
            print("[-] Administration not found, trying direct URL...")
            page.goto('http://localhost:8080/admin', wait_until='networkidle')

        time.sleep(2)
        page.screenshot(path='screenshots/02-admin-page.png')
        print(f"[*] Current URL: {page.url}")

        # Look for Detail Manager
        print("\n[*] Looking for Detail Manager role...")
        detail_mgr = page.locator('text=Detail Manager').first

        if detail_mgr.is_visible(timeout=5000):
            print("[+] Found Detail Manager")

            # Find Bell button near it
            print("[*] Looking for notification button (Bell icon)...")

            # Try to find the button container first
            card = detail_mgr.locator('..').locator('..').locator('..')

            # Look for button with title containing notification
            bell_btn = card.locator('button[title*="Notification" i]').first

            if bell_btn.is_visible():
                print("[+] Found notification button")
                print("[*] Clicking notification button...")

                # Clear logs
                console_logs.clear()

                # Click
                bell_btn.click()
                time.sleep(2)

                page.screenshot(path='screenshots/03-modal-open.png')
                print("[*] Screenshot: 03-modal-open.png")

                # Print logs
                print("\n" + "="*60)
                print("CONSOLE LOGS CAPTURED:")
                print("="*60)
                for log in console_logs:
                    print(log)

                if len(console_logs) == 0:
                    print("[!] No debug logs captured")

                # Check modal
                if page.locator('[role="dialog"]').is_visible():
                    print("\n[+] Modal is visible")

                    # Get all text with "events enabled"
                    stats = page.locator('text=/\\d+ of \\d+ events enabled/').all()
                    print(f"[*] Found {len(stats)} module stats:")
                    for stat in stats:
                        print(f"    - {stat.text_content()}")
                else:
                    print("[-] Modal not visible")

                print("\n[*] Waiting 5 seconds...")
                time.sleep(5)

                page.screenshot(path='screenshots/04-final.png')
                print("[*] Screenshot: 04-final.png")

            else:
                print("[-] Notification button not found")
                all_buttons = card.locator('button').all()
                print(f"[*] Found {len(all_buttons)} buttons in card")

        else:
            print("[-] Detail Manager not found")
            print("[*] Page content preview:")
            print(page.text_content('body')[:300])

    except Exception as e:
        print(f"[ERROR] {e}")
        page.screenshot(path='screenshots/error.png')

    print("\n[*] Closing browser in 3 seconds...")
    time.sleep(3)
    browser.close()

    print("\n" + "="*60)
    print(f"SUMMARY: {len(console_logs)} console logs captured")
    print("="*60)
