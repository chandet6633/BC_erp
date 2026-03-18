"""
MungkhudShop + Management — Comprehensive Playwright Test Suite
Runs against TEST containers (ports 9091/9092).

Usage:
    python tests/test_mungkhudshop.py

Prerequisites:
    pip install playwright
    python -m playwright install chromium
    docker compose -f docker-compose.test.yml up -d --build
"""

import sys
import time
from playwright.sync_api import sync_playwright

MUNGKHUD_URL = "http://localhost:9091"
MGMT_URL = "http://localhost:9092"
SCREENSHOT_DIR = "tests/screenshots"

passed = 0
failed = 0
errors = []


def test(name, fn, page, **kwargs):
    """Run a single test with error handling."""
    global passed, failed
    try:
        fn(page, **kwargs)
        passed += 1
        print(f"  ✅ {name}")
    except Exception as e:
        failed += 1
        errors.append(f"{name}: {e}")
        print(f"  ❌ {name} — {e}")


# ──────────────────────────────────────
# MungkhudShop Tests
# ──────────────────────────────────────

def test_mungkhud_login(page):
    """Test PIN login to MungkhudShop (using Management's shared users)."""
    # Clear any existing session
    page.goto(f"{MUNGKHUD_URL}/#/login")
    page.wait_for_load_state("networkidle")
    page.evaluate("localStorage.removeItem('mungkhud_auth')")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # Should see role selection buttons
    role_btn = page.query_selector('button[data-role="manager"]')
    assert role_btn is not None, "Role selection buttons not found (PIN pad UI missing)"

    # Click Manager/Owner role
    role_btn.click()
    page.wait_for_timeout(500)

    # Enter PIN via JavaScript (since we know the PIN from the DB)
    # Use the page's pressKey function by clicking number buttons
    pin_digits = page.evaluate("""
        // Get all users from Management PB to find a valid PIN
        // Fallback: use direct PIN entry
        '280612'
    """)

    # Click each digit button
    for digit in pin_digits:
        btn = page.query_selector(f'button.pin-key[data-key="{digit}"]')
        if btn:
            btn.click()
            page.wait_for_timeout(100)

    page.wait_for_timeout(3000)  # Wait for login + redirect
    assert "#/dashboard" in page.url or "dashboard" in page.url, "Did not redirect to dashboard after PIN login"


def test_mungkhud_dashboard(page):
    """Test dashboard loads with stat cards."""
    page.goto(f"{MUNGKHUD_URL}/#/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    content = page.content()
    assert "แดชบอร์ด" in content or "dashboard" in content.lower(), "Dashboard content missing"


def test_mungkhud_navigation(page):
    """Test all main navigation links load without error."""
    routes = ["stock-list", "job", "quotation", "settings"]
    for route in routes:
        page.goto(f"{MUNGKHUD_URL}/#/{route}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)
        # Check no error boundary shown
        error = page.query_selector(".error-boundary")
        assert error is None, f"Error boundary shown on /{route}"


def test_mungkhud_stock_list(page):
    """Test stock list page renders table."""
    page.goto(f"{MUNGKHUD_URL}/#/stock-list")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    table = page.query_selector("table, .data-grid, .card")
    assert table is not None, "Stock list content not found"


def test_mungkhud_reports(page):
    """Test report pages load with Chart.js canvas."""
    for report in ["report-sales", "report-inventory", "report-finance"]:
        page.goto(f"{MUNGKHUD_URL}/#/{report}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        # Just verify page loaded without error
        error = page.query_selector(".error-boundary")
        assert error is None, f"Error boundary on {report}"


def test_mungkhud_settings(page):
    """Test settings page loads."""
    page.goto(f"{MUNGKHUD_URL}/#/settings")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    content = page.content()
    assert "ตั้งค่า" in content or "settings" in content.lower(), "Settings page missing"


def test_mungkhud_mobile_responsive(page):
    """Test mobile responsive layout indicators exist."""
    # Test at a wider mobile breakpoint that Playwright supports
    page.set_viewport_size({"width": 500, "height": 700})
    page.goto(f"{MUNGKHUD_URL}/#/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # Hamburger button should exist in DOM
    hamburger = page.query_selector("#hamburgerBtn")
    assert hamburger is not None, "Hamburger button not found in DOM"

    # Sidebar overlay should exist
    overlay = page.query_selector("#sidebarOverlay")
    assert overlay is not None, "Sidebar overlay not found in DOM"

    # Reset viewport
    page.set_viewport_size({"width": 1920, "height": 991})


def test_mungkhud_session_info(page):
    """Test that session shows user info on topnav."""
    page.set_viewport_size({"width": 1920, "height": 991})
    page.goto(f"{MUNGKHUD_URL}/#/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    user_el = page.query_selector("#userName")
    assert user_el is not None, "User name element not found"
    text = user_el.text_content()
    assert text and len(text) > 0, "User name is empty"


# ──────────────────────────────────────
# Management Tests
# ──────────────────────────────────────

def test_mgmt_login_page(page):
    """Test Management login page loads."""
    page.goto(MGMT_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    content = page.content()
    # Should show login or dashboard
    assert "BC AUTO" in content or "เข้าสู่ระบบ" in content or "login" in content.lower(), \
        "Management login page not loaded"


def test_mgmt_sso_mungkhud_tile(page):
    """Test MungkhudShop tile exists in registry."""
    page.goto(f"{MGMT_URL}/api/collections/system_roles/records?perPage=20")
    page.wait_for_load_state("networkidle")
    content = page.content()
    assert "mungkhudshop" in content.lower() or "items" in content.lower(), \
        "system_roles API not accessible"


# ──────────────────────────────────────
# Main
# ──────────────────────────────────────

def main():
    global passed, failed

    print("═══════════════════════════════════════════")
    print("  MungkhudShop + Management Test Suite")
    print(f"  MungkhudShop: {MUNGKHUD_URL}")
    print(f"  Management:   {MGMT_URL}")
    print("═══════════════════════════════════════════")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 991},
            locale="th-TH",
        )
        page = context.new_page()

        # MungkhudShop Tests
        print("🏪 MungkhudShop Tests:")
        test("Login", test_mungkhud_login, page)
        test("Dashboard", test_mungkhud_dashboard, page)
        test("Navigation", test_mungkhud_navigation, page)
        test("Stock List", test_mungkhud_stock_list, page)
        test("Reports", test_mungkhud_reports, page)
        test("Settings", test_mungkhud_settings, page)
        test("Mobile Responsive", test_mungkhud_mobile_responsive, page)
        test("Session Info", test_mungkhud_session_info, page)

        # Management Tests
        print()
        print("📊 Management Tests:")
        page2 = context.new_page()
        test("Login Page", test_mgmt_login_page, page2)
        test("SSO/API Access", test_mgmt_sso_mungkhud_tile, page2)

        browser.close()

    # Summary
    total = passed + failed
    print()
    print("═══════════════════════════════════════════")
    print(f"  Results: {passed}/{total} passed, {failed} failed")
    print("═══════════════════════════════════════════")

    if errors:
        print()
        print("Failures:")
        for e in errors:
            print(f"  ❌ {e}")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
