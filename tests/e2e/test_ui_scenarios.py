
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"

def test_runs_search_and_filter(page: Page):
    """Verify searching and filtering runs works."""
    page.goto(f"{BASE_URL}/runs")
    
    # 1. Open Filters
    page.get_by_role("button", name="Filters").click()
    
    # 2. Status Filter
    status_container = page.locator("div").filter(has=page.locator("label", has_text="Status")).last
    select = status_container.locator("select")
    
    expect(select).to_be_visible()
    select.select_option("completed")
    
    # 3. Verify Filter
    # Check that at least one completed badge is visible.
    expect(page.locator("span").filter(has_text="completed").first).to_be_visible()
    
    # 4. Search
    search_input = page.get_by_placeholder("Search by ID, graph, or framework...")
    search_input.fill("non-existent-id-99999")
    
    # "No runs found" should appear
    expect(page.get_by_text("No runs found")).to_be_visible()
    
    # Clear search
    search_input.fill("")
    expect(page.get_by_text("No runs found")).not_to_be_visible()

def test_run_detail_interactions(page: Page):
    """Verify interactive elements on Run Detail page."""
    page.goto(f"{BASE_URL}/runs")
    
    # Navigate to First Run
    page.locator("a[href^='/runs/']").first.click()
    
    # 1. Switch to Graph View
    graph_btn = page.get_by_role("button", name="Graph")
    expect(graph_btn).to_be_visible()
    graph_btn.click()
    
    # Check Graph Content
    expect(page.get_by_text("Workflow Graph")).to_be_visible()
    
    # Switch back to Timeline
    page.get_by_role("button", name="Timeline").click()
    expect(page.get_by_text("Workflow Graph")).not_to_be_visible()
    
    # 2. Expand Node
    # Locate button for the first node (index 1)
    node_btn = page.locator("button").filter(has_text="1").first
    node_btn.click()
    
    # Verify State or Messages HEADER appears
    expect(page.get_by_role("heading", name="State").or_(page.get_by_role("heading", name="Messages")).first).to_be_visible()

def test_dashboard_customization(page: Page):
    """Verify adding a widget to the dashboard."""
    page.goto(BASE_URL)
    
    # 1. Open Library
    page.get_by_role("button", name="Add Widget").click()
    
    # 2. Locate Library
    library = page.locator("div.bg-card").filter(has_text="Widget Library").first
    expect(library).to_be_visible()
    
    # 3. Add "Total Runs" Widget
    library.get_by_role("button", name="Total Runs").click()
    
    # 4. Close Library
    # The Close button is the first button in the library container (the X button)
    close_btn = library.locator("button").first
    close_btn.click()
    
    # 5. Verify Library Closed
    expect(library).not_to_be_visible()
    
    # 6. Verify Widget Count
    count = page.get_by_text("Total Runs").count()
    assert count >= 1

def test_404_handling(page: Page):
    """Verify 404 handling."""
    page.goto(f"{BASE_URL}/runs/00000000-0000-0000-0000-000000000000")
    expect(page.get_by_text("Run not found")).to_be_visible()
    expect(page.get_by_role("link", name="Back to Dashboard")).to_be_visible()
