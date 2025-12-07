
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"

def test_docs_navigation(page: Page):
    """Verify documentation navigation and rendering."""
    page.goto(BASE_URL)
    
    # 1. Click "Docs" in Sidebar
    # Use robust locator in case accessibility name is complex
    docs_link = page.locator("nav a").filter(has_text="Docs").first
    expect(docs_link).to_be_visible()
    docs_link.click()
    
    # 2. Verify Intro Page
    # Default should be intro
    # Wait for URL to change (timeout logic implicit in expect)
    expect(page).to_have_url(f"{BASE_URL}/docs/intro")
    expect(page.get_by_text("The Agentic Application Platform for Engineers")).to_be_visible()
    
    # 3. Navigate to "LangGraph" via Sidebar (Docs internal sidebar)
    # The Docs sidebar has links too.
    # Docs sidebar is <aside> ... <nav>
    # Let's find the link explicitly in the docs sidebar to distinguish from main sidebar (if visible)
    # The docs sidebar links have text "LangGraph".
    page.locator("aside nav a").filter(has_text="LangGraph").click()
    
    expect(page).to_have_url(f"{BASE_URL}/docs/langgraph")
    
    # 4. Verify Content
    expect(page.get_by_role("heading", name="LangGraph Integration")).to_be_visible()
    # Verify code block exists
    expect(page.locator("pre").first).to_be_visible()

def test_docs_mobile_sidebar(page: Page):
    """Verify mobile sidebar interaction for docs."""
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto(f"{BASE_URL}/docs/intro")
    
    # In Docs layout (mobile), we have a header with a menu button.
    # <div className="md:hidden ..."> <button ...> <Menu/> </button> ... </div>
    # The button doesn't have text.
    menu_btn = page.locator("main .md\:hidden button").first
    expect(menu_btn).to_be_visible()
    menu_btn.click()
    
    # 2. Verify Sidebar Visible
    # Sidebar is <aside>. It slides in.
    sidebar = page.locator("aside").first # Docs sidebar
    expect(sidebar).to_be_visible()
    
    # 3. Navigate
    # Click "MCP Protocol"
    page.locator("aside a").filter(has_text="MCP Protocol").click()
    
    # Sidebar should close automatically on nav
    # Verify we are on MCP page
    expect(page.get_by_role("heading", name="Model Context Protocol")).to_be_visible()
