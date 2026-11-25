# Storyboard Standard: Exhaustive SaaS Coverage

Use this checklist when designing storyboards for any multi-section web application.

## 1. The "Overview -> Top-to-Bottom -> Tab-by-Tab -> Every Modal" Rule

Never jump randomly across a screen or skip secondary tabs. Follow this exact order for every section:

1. **Section Orientation (Scene 1):**
   - Show where we are in the left/top navigation.
   - If the section contains multiple tabs (e.g., 3 tabs: *Organizations*, *Users*, *Roles*), highlight the tab bar and explicitly name all tabs upfront so the viewer builds a mental map.
2. **Tab 1 Full Pass:**
   - Walk the tab's content top-to-bottom (KPI cards, filters, table/list, key row actions like edit/delete/impersonate).
   - For every primary creation or configuration modal in Tab 1:
     - Trigger the modal open (`click_btn:...` or `click_primary_btn:...`).
     - Highlight `.modal-card` (with optional `"zoom": 1.12`) and explain what each important field does.
     - Close the modal cleanly (`close_modal`).
3. **Tab 2 Full Pass:**
   - Switch to Tab 2 (`click_tab:...`).
   - Explain the purpose of Tab 2, walk its main controls top-to-bottom, open its modals, explain them, and close them.
4. **Tab 3+ Full Pass:**
   - Repeat until every tab in the section has been demonstrated.

## 2. Role & Entry Separation

- **Auth video (`00_login.mp4`):** Always standalone. Covers login fields, show-password toggle, first-time account activation, and password recovery. Never glued to the main dashboard video.
- **Role playlists:** If an app has distinct role views (e.g., End-User vs. Admin/Management), produce separate role playlists. A manager should never watch a stripped-down user screen missing half their tabs.

## 3. Storyboard JSON Schema

```json
[
  {
    "id": "02_team",
    "nav": "/team",
    "privacyBlurSelectors": [".sidebar-logo", ".org-title"],
    "scenes": [
      {
        "id": "01_tabs_overview",
        "text": "Spoken narration for this scene.",
        "badge": "Short red pill label",
        "selector": "button.tab-btn",
        "highlightParent": true,
        "arrow": "bottom",
        "dim": true,
        "zoom": 1.0,
        "padAfterMs": 350
      }
    ]
  }
]
```

### Supported `action` Commands
- `click_tab:<text>` - scrolls to top and clicks a `.tab-btn` containing `<text>`
- `click_btn:<text>` - clicks any button in `main` containing `<text>`
- `click_primary_btn:<text>` - clicks `main button.btn-primary` containing `<text>`
- `click_card_primary:<keyword>` - finds `.shell-card` containing `<keyword>` and clicks its `.btn-primary`
- `close_modal` - closes the active `.modal-card`
- `close_modal_then_tab:<tab>` - closes modal, then switches to `<tab>`
- `close_modal_then_tab_and_btn:<tab>|<btn>` - closes modal, switches tab, opens next modal
- `scroll_bottom` / `scroll_top` - smooth page scroll
