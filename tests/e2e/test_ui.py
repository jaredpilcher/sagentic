
import pytest
from playwright.sync_api import Page, expect

# Docker mapped port
BASE_URL = "http://localhost:3000"

def test_dashboard_loads(page: Page):
    """Verify Dashboard Loads and displays key elements."""
    page.goto(BASE_URL)
    
    # 1. Title check (H2 Dashboard)
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
    
    # 2. Key Stats text check
    # We look for the subtitle text to confirm dashboard content
    expect(page.get_by_text("Monitor your LangGraph agent executions")).to_be_visible()
    
    # 3. Check for "Add Widget" button
    expect(page.get_by_role("button", name="Add Widget")).to_be_visible()

def test_runs_list_navigation(page: Page):
    """Verify Runs List navigation and content."""
    page.goto(BASE_URL)
    
    # Navigate to Runs
    page.get_by_role("link", name="Runs").click()
    
    # Verify URL
    expect(page).to_have_url(f"{BASE_URL}/runs")
    
    # Verify Header
    expect(page.get_by_role("heading", name="All Runs")).to_be_visible()
    
    # Verify "Filters" button (RunsList.tsx)
    expect(page.get_by_role("button", name="Filters")).to_be_visible()
    
    # Verify at least one run card acts as a link (seeded data)
    expect(page.locator("a[href^='/runs/']").first).to_be_visible()

def test_run_detail_view(page: Page):
    """Verify extensive details of a Run."""
    page.goto(f"{BASE_URL}/runs")
    
    # Click the first run
    page.locator("a[href^='/runs/']").first.click()
    
    # Verify Back Link
    expect(page.get_by_role("link", name="Back to All Runs")).to_be_visible()
    
    # Verify Tabs (implemented as buttons)
    expect(page.get_by_role("button", name="Timeline")).to_be_visible()
    expect(page.get_by_role("button", name="Graph")).to_be_visible()
    
    # Verify Metadata section
    expect(page.get_by_text("Run Metadata")).to_be_visible()

def test_extensions_list(page: Page):
    """Verify Extensions view."""
    page.goto(BASE_URL)
    page.get_by_role("link", name="Extensions").click()
    
    expect(page).to_have_url(f"{BASE_URL}/extensions")
    expect(page.get_by_role("heading", name="Extensions")).to_be_visible()
    
    # Verify "Install Extension" button (Extensions.tsx)
    expect(page.get_by_text("Install Extension")).to_be_visible()
    
    # Verify Refresh button exists
    expect(page.get_by_role("button", name="Refresh")).to_be_visible()
