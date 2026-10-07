# Lister Web Application - Implementation Plan

## Project Overview
Build a hierarchical list management web application ("lister") with bilingual support (Ukrainian/English), customizable fields, localStorage persistence, and JSON import/export.

---

## Phase 1: Project Setup & Foundation

### 1.1 File Structure
```
/lister
├── index.html
├── css/
│   ├── variables.css
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   └── utils.css
├── js/
│   ├── core/
│   │   ├── StateManager.js
│   │   ├── StorageManager.js
│   │   └── EventBus.js
│   ├── models/
│   │   ├── List.js
│   │   ├── ListItem.js
│   │   └── FieldConfig.js
│   ├── ui/
│   │   ├── Renderer.js
│   │   ├── ListView.js
│   │   ├── ItemView.js
│   │   ├── FieldEditor.js
│   │   └── LanguageSwitcher.js
│   ├── i18n/
│   │   ├── Translator.js
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── uk.json
│   │   └── index.js
│   ├── utils/
│   │   ├── dom.js
│   │   ├── json.js
│   │   └── helpers.js
│   └── app.js
└── assets/
```

### 1.2 HTML Structure (index.html)
- Semantic HTML5 with proper accessibility
- Root element with `lang` attribute (dynamic)
- Main regions: header (language switcher), main (lists container), footer
- Script type="module" for ES6 modules

### 1.3 CSS Architecture
- CSS Custom Properties for theming
- BEM naming convention
- Mobile-first responsive design
- Text-like interface: underlined editable fields, no borders
- Minimalist aesthetic

---

## Phase 2: Core Data Models

### 2.1 FieldConfig Model
```javascript
// Field types: 'content' | 'cost' | 'time' | 'completed'
class FieldConfig {
  constructor(type, enabled = true, label = '')
  // Methods: toggle(), getDefaultValue(), validate(value)
}
```

### 2.2 ListItem Model
```javascript
class ListItem {
  constructor(id, fields = {}, children = [], parentId = null)
  // Fields: { content: '', cost: 0, time: 0, completed: false }
  // Methods: 
  //   - addChild(item), removeChild(id)
  //   - updateField(field, value)
  //   - getTotalCost(), getTotalTime()
  //   - getCompletedState() // true/false/null (partial)
  //   - toJSON(), static fromJSON()
}
```

### 2.3 List Model
```javascript
class List {
  constructor(id, name, fieldConfig, items = [])
  // Methods:
  //   - addItem(item), removeItem(id), updateItem(id, fields)
  //   - getTotalCost(), getTotalTime()
  //   - updateFieldConfig(config)
  //   - toJSON(), static fromJSON()
}
```

### 2.4 StateManager (Singleton)
- Manages all lists: `Map<listId, List>`
- Active list tracking
- Events: `list:created`, `list:deleted`, `list:updated`, `item:added`, `item:updated`, `item:deleted`, `fieldConfig:changed`
- Methods: `getList(id)`, `getAllLists()`, `createList()`, `deleteList()`, `setActiveList()`

---

## Phase 3: Persistence Layer

### 3.1 StorageManager
- localStorage key: `lister-data`
- Schema versioning for migrations
- Methods: `save(state)`, `load()`, `clear()`, `exportJSON()`, `importJSON(json)`
- Auto-save on state changes (debounced 300ms)

### 3.2 JSON Import/Export
- Export: full state including all lists, field configs, items
- Import: validation, merge/replace options, version migration
- File download/upload via Blob/FileReader API

---

## Phase 4: Internationalization (i18n) - Requirement 15

### 4.1 Translator Module
```javascript
class Translator {
  constructor()
  // Methods:
  //   - init() - detect system language, default to 'en' if not 'uk'
  //   - setLocale(locale) - 'en' | 'uk'
  //   - getLocale()
  //   - t(key, params) - translate with interpolation
  //   - onLocaleChange(callback)
}
```

### 4.2 Locale Files
**en.json**:
```json
{
  "app.title": "Lister",
  "list.new": "New List",
  "list.delete": "Delete List",
  "list.edit": "Edit List",
  "item.add": "Add Item",
  "item.nested": "Add Nested List",
  "item.delete": "Delete",
  "field.content": "Content",
  "field.cost": "Cost",
  "field.time": "Time",
  "field.completed": "Completed",
  "fields.configure": "Configure Fields",
  "total.cost": "Total Cost",
  "total.time": "Total Time",
  "actions.export": "Export JSON",
  "actions.import": "Import JSON",
  "lang.switch": "Language",
  "placeholder.content": "Enter content..."
}
```

**uk.json**: (Ukrainian translations)

### 4.3 Language Switcher UI Component
- Button group: `ua | en` (BEM: `.lang-switcher__btn--active`)
- Persists preference in localStorage (`lister-locale`)
- Updates `document.documentElement.lang` and all rendered text

### 4.4 Integration Points
- All UI components use `t()` for text
- Dynamic locale change triggers full re-render
- Date/number formatting per locale

---

## Phase 5: UI Components & Rendering

### 5.1 Renderer (Core)
- Virtual DOM-lite or direct DOM manipulation
- BEM class generation utilities
- Event delegation for dynamic elements

### 5.2 ListView
- Renders list header: name, total cost, total time, actions (edit, delete, export, import, configure fields)
- Renders items recursively (nested lists)
- Empty state handling

### 5.3 ItemView
- Renders single item with enabled fields
- Content: editable `<span contenteditable>` with underline
- Cost/Time: `<input type="number">` styled as underlined text
- Completed: `<input type="checkbox">` with tri-state visual (checked, unchecked, indeterminate)
- Actions: add item, add nested, delete (icon buttons)
- Nested lists rendered inline with indentation

### 5.4 FieldEditor (Modal/Panel)
- List-level field configuration
- Toggle checkboxes for: cost, time, completed (content always enabled)
- Live preview of field changes
- Applies to all items and nested lists in that list

### 5.5 ListManager UI
- Sidebar or top bar showing all lists
- Create new list, switch active list, rename, delete

---

## Phase 6: Interaction Logic

### 6.1 Event Handlers
- Contenteditable: blur → save, Enter → save + new item
- Number inputs: change → validate → save
- Checkbox: change → update parent completed state recursively
- Buttons: delegated click handlers

### 6.2 Nested List Operations
- Add nested list to item → creates new List as child
- Recursive rendering with depth-based indentation
- Aggregate totals bubble up to root

### 6.3 Completed State Propagation
- Leaf: user toggles checkbox
- Parent: computes from children
  - All true → true
  - All false → false
  - Mixed → indeterminate (gray)
- Visual: checkbox with `indeterminate` property

---

## Phase 7: Default State & Initialization

### 7.1 App Bootstrap (app.js)
```javascript
async function init() {
  // 1. Load locale preference or detect system language
  // 2. Initialize Translator
  // 3. Load state from localStorage
  // 4. If empty: create default list with one empty item
  // 5. Focus content field of first item
  // 6. Render initial UI
  // 7. Set up auto-save
}
```

### 7.2 Default State
- One list named "Untitled List"
- Field config: content (enabled), cost/time/completed (enabled by default)
- One item: content="", cost=0, time=0, completed=false
- Cursor in content field (contenteditable focus)

---

## Phase 8: Responsive & Polish

### 8.1 Mobile-First CSS
- Breakpoints: 480px, 768px, 1024px
- Touch-friendly tap targets (44px min)
- Collapsible nested lists on mobile
- Swipe gestures for item actions (optional)

### 8.2 Text-Like Interface Refinements
- `contenteditable` elements: `text-decoration: underline; text-underline-offset: 2px;`
- Focus styles: subtle background, no outline
- Transitions for smooth interactions
- Print stylesheet for clean exports

### 8.3 Accessibility
- ARIA labels on icon buttons
- Keyboard navigation: Tab, Enter, Escape, Arrow keys
- Screen reader announcements for dynamic updates
- Focus management on modal open/close

---

## Phase 9: Testing & Validation

### 9.1 Manual Test Scenarios
1. Create list, add items, nest lists → verify totals
2. Toggle completed → verify parent state propagation
3. Configure fields → verify persistence and child inheritance
4. Switch language → verify all text updates
5. Export JSON → import into new browser → verify state
6. Refresh page → verify localStorage restore
7. Mobile viewport → verify usability

### 9.2 Edge Cases
- Deep nesting (50+ levels) - performance
- Large lists (1000+ items) - virtualization not required but test
- Invalid JSON import - graceful error
- Corrupted localStorage - recovery
- Rapid edits - debounce prevents data loss

---

## Dependencies Between Phases

```
Phase 1 (Setup)
    ↓
Phase 2 (Models) ← Phase 3 (Storage)
    ↓
Phase 4 (i18n) ← independent, can parallel
    ↓
Phase 5 (UI Components) ← uses Models, i18n
    ↓
Phase 6 (Interactions) ← uses UI, Models
    ↓
Phase 7 (Bootstrap) ← integrates all
    ↓
Phase 8 (Polish) ← iterative with 5-7
    ↓
Phase 9 (Testing) ← final validation
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| ES6 Modules | Native, no build step, browser support |
| localStorage | Requirement 10, simple persistence |
| contenteditable | Requirement 25 (text-like, underlined) |
| BEM CSS | Requirement 34 (maintainable, predictable) |
| Event-driven State | Decouples UI from data, enables reactivity |
| Recursive rendering | Arbitrary nesting depth (requirement 9) |
| Tri-state checkbox | Requirement 14 (partial completion) |

---

## Out of Scope
- Backend synchronization
- User accounts/authentication
- Rich text editing (markdown, formatting)
- Drag-and-drop reordering
- Undo/redo history
- Keyboard shortcuts (beyond basic navigation)
- Themes/dark mode

---

## Validation Checklist (Definition of Done)

- [ ] All 15 requirements from project.md implemented
- [ ] Bilingual: system language detection, default English, ua/en switcher persists
- [ ] Nested lists: arbitrary depth, recursive totals
- [ ] Customizable fields per list with inheritance
- [ ] localStorage persistence survives refresh
- [ ] JSON export/import roundtrip works
- [ ] Default state: one list, one empty item, focused content
- [ ] Text-like interface: underlined editable, no borders
- [ ] Responsive: mobile, tablet, desktop
- [ ] Semantic HTML, BEM CSS, ES6 modules
- [ ] Accessible: keyboard, screen reader, ARIA