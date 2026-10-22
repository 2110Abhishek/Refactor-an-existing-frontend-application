# Export Software Frontend — Shipping Bill Refactoring

Built on top of [fe-zen-arch](git@github.com:shivamkj/fe-zen-arch.git) — the core shared architecture for B2B SaaS frontends.

---

## 1. Quick Start & Execution

```bash
# 1. Install dependencies across workspace & submodules
pnpm install

# 2. Start local development server (port 5173)
pnpm dev

# 3. Run type checking & linting
pnpm exec tsc --incremental
pnpm exec eslint src/shipping-bills

# 4. Build production bundle
pnpm build
```

---

## 2. Refactoring Summary: What Was Changed & Why

### The Problem
The starter implementation of the Shipping Bill creation form was located entirely within a single monolithic file (`src/shipping-bills/shipping-bill-form.tsx`) exceeding **1,760 lines of code**. It suffered from:
- **Tight Coupling**: Direct mixing of presentation UI, form state, validation logic, mock database arrays, and customs arithmetic in a single component.
- **Extreme Duplication**: Exporter, Consignee, and Buyer party selection logic was duplicated three times (~250 lines of identical UI and state).
- **Direct Mock Array Imports**: UI components directly imported hardcoded static arrays rather than querying an asynchronous service layer.
- **Missing Loading/Error/Empty States**: No user feedback during simulated network latency, missing data, or submission failures.
- **Maintainability & Extension Hurdles**: Adding a new customs field or modifying an invoice calculation required navigating hundreds of lines of interleaved JSX and state handlers.

### The Solution: Layered, Modular Architecture

The 1,760-line monolith was refactored into a clean, modular structure with strict separation of concerns:

```
src/shipping-bills/
├── components/
│   ├── async-party-select.tsx         # Debounced asynchronous party search popover
│   ├── cargo-documents-section.tsx    # Containers, packing ranges, e-SANCHIT docs, licences
│   ├── exporter-section.tsx           # Exporter and Consignee entity & branch selectors
│   ├── form-actions.tsx               # Action bar with navigation, draft saving, & double-submit protection
│   ├── form-state-feedback.tsx        # UI states: Loading, Empty, Error with retry, & Success modal
│   ├── goods-item-editor.tsx          # Dialog editor for invoice line items with customs details
│   ├── invoices-section.tsx           # Invoices list, charges, adjustments, and line item management
│   ├── party-fields.tsx               # Reusable Entity + Branch selector pair (eliminates duplication)
│   ├── shipment-section.tsx           # Transport mode, ports, RBI waiver, weights, marks & numbers
│   └── workflow-steps-header.tsx      # Step progress bar (Details -> Invoices -> Others)
├── hooks/
│   ├── use-shipping-bill-form.ts      # Main form orchestrator hook (state, tabs, validation, submit)
│   └── use-shipping-bill-options.ts   # Async options query hook (loading, error, ready states)
├── services/
│   ├── marks-and-numbers-service.ts   # Async Promise-based lookup of marks & numbers by exporter ID
│   ├── party-mock-service.ts          # Async party/port search and creation service
│   └── shipping-bill-service.ts       # API-ready service (getShippingBillOptions, submitShippingBill)
├── utils/
│   └── shipping-bill-helpers.ts       # Pure calculations, payload transformers, flat-file generator
├── validation/
│   └── shipping-bill-validation.ts    # React Hook Form schema + pure domain customs validator
├── model.ts                           # Domain TypeScript interfaces and types
├── demo-store.ts                      # Local storage and state synchronization
└── shipping-bill-form.tsx             # Clean ~200-line orchestrator page component
```

---

## 3. Architecture & Separation of Concerns

### A. Presentation Layer (`src/shipping-bills/components/`)
- **Focused, Single-Responsibility Components**: Each tab and major domain block lives in its own component (`ExporterSection`, `ShipmentSection`, `InvoicesSection`, `CargoDocumentsSection`).
- **Reusable `PartyFields`**: Consolidates entity selection, branch selection, address display, and "Quick Add" party modal triggers into a single reusable component, eliminating ~250 lines of duplicate code across Exporter, Consignee, and Buyer sections.
- **Workflow Progress Bar (`WorkflowStepsHeader`)**: Provides visual step indicators displaying current and completed steps, enhancing usability.
- **First-Class State Feedback (`FormStateFeedback`)**:
  - `FormLoadingState`: Skeleton loading animation during initial options fetch.
  - `FormEmptyState`: Friendly notice if reference data is missing.
  - `FormErrorState`: Alert banner with a "Retry" button allowing graceful recovery.
  - `SubmissionSuccessModal`: Post-submission confirmation showing generated reference numbers and download options.

### B. State Orchestration Layer (`src/shipping-bills/hooks/`)
- **`useShippingBillForm`**:
  - Bridges `fe-zen-arch`'s `useForm` (`FormContextData<ShippingBillFormValues>`).
  - Manages tab navigation (`'details' | 'invoices' | 'others'`) and tab-level validation gates.
  - Manages modal visibility for "Quick Add" exporter, consignee, buyer, and invoice item editors.
  - Handles auto-population of Marks & Numbers when an exporter is selected.
  - Guards against duplicate submissions using an `isSubmitting` flag.
- **`useShippingBillOptions`**:
  - Encapsulates the lifecycle of asynchronous options fetching (`loading` | `ready` | `empty` | `error`).
  - Implements unmount-safe cancellation to prevent memory leaks.

### C. API-Ready Mock Service Layer (`src/shipping-bills/services/`)
- **Zero Direct Static Imports in UI**: UI components never import static arrays directly. All options and party data are fetched asynchronously via Promise-based service methods (`shippingBillService.getShippingBillOptions()`).
- **Real-World Network Simulation**: Simulates network latency (300ms) and returns structured response objects.
- **Testing Controls (`serviceTestingControls`)**:
  Includes programmatic controls to simulate edge cases for automated and manual verification:
  - `serviceTestingControls.setSimulateOptionError(true)` -> Triggers option fetch failure and displays `FormErrorState` with retry.
  - `serviceTestingControls.setSimulateEmptyOptions(true)` -> Triggers empty options state (`FormEmptyState`).
  - `serviceTestingControls.setSimulateSubmissionError(true)` -> Triggers submission network error banner.
- **Easy Replaceability**: To connect to a live backend, simply replace the mock implementations inside `shipping-bill-service.ts` with `fetch()` or `axios` calls to your REST/GraphQL API. The function signatures and return types remain identical.

### D. Pure Domain Logic & Utilities (`src/shipping-bills/utils/`)
- **Pure Arithmetic Calculations**:
  - `calculateLineTotal(quantity, unitPrice)`
  - `calculateInvoiceTotal(items)`
  - `calculateGrandTotal(invoices)`
  - `formatMoney(amount, currency)`
- **Port Country Resolution**: Derives ISO country codes from UN/LOCODE prefixes or lookup tables.
- **ICEGATE Flat-File Generation**: Generates compliant `.sb` flat-files for Indian Customs Electronic Data Interchange (ICEGATE) submission.

### E. Two-Tier Validation Architecture (`src/shipping-bills/validation/`)
1. **React Hook Form Schema**: Validates inline fields and enforces required attributes.
2. **Pure Domain Validator (`validateShippingBill`)**: Runs comprehensive customs checks before submission, mapping any validation errors directly to the specific tab where the error occurred (`details`, `invoices`, or `others`), and automatically switching the user to that tab.

---

## 4. Domain Assumptions & Practical Customs Logic

1. **RITC / HS Codes**: Validated as 8-digit numeric codes adhering to Indian Customs RITC classification standards.
2. **Dual-Unit Packaging & Weights**: Gross weight must be greater than or equal to Net weight. Both are validated as positive decimal numbers.
3. **Duty Drawback & Scheme Codes**:
   - Scheme codes like `19` (Drawback) or `44` dynamically reveal DBK and customs drawback inputs.
   - Pure commercial exports (`00` / Free Shipping Bill) omit duty concession requirements.
4. **Customs Reference Numbers**: Simulated submissions assign a realistic customs job identifier formatted as `SB-MOCK-YYYYMMDD-XXXX`.
5. **e-SANCHIT Documents**: Supporting cargo documents support standard document type codes (e.g., Invoice `380000`, Packing List `271000`) and issue dates.

---

## 5. Tradeoffs & Engineering Decisions

| Decision | Rationale | Tradeoff |
| :--- | :--- | :--- |
| **Zero New Dependencies** | Maintained 100% compliance with assignment constraints; relied solely on existing project libraries (`fe-zen-arch`, React Hook Form, Lucide icons, Tailwind CSS). | Did not add Zod or heavy validation libraries; built a lightweight, type-safe custom schema validator. |
| **Strict Kebab-Case Naming** | The repository enforces `check-file/filename-naming-convention` via ESLint. All new files are strictly kebab-case (e.g. `use-shipping-bill-form.ts`). | Requires consistent import paths rather than PascalCase component filenames. |
| **Submodule Preservation** | Kept `fe-zen-arch` submodule untouched and cleanly adapted to its `FormContextData` contract. | Required careful typing to ensure `formCtx.hooks.register` and `formCtx.hooks.watch` match fe-zen-arch's internal structure. |
| **Two-Tier Validation** | Allowed fast, non-blocking form interaction while guaranteeing zero invalid submissions via deep pre-flight validation. | Validation rules are declared in both the field schema and the deep validator; mitigated by co-locating them in `shipping-bill-validation.ts`. |

---

## 6. AI Usage & Approach

### Tools Used
- **Antigravity AI Assistant** (Google DeepMind Advanced Agentic Coding system).
- Integrated workspace diagnostics (TypeScript language server, ESLint integration, background task runner, file edit tools).

### Human-in-the-Loop Engineering Judgment
- **Architectural Scaffolding**: Rather than allowing generic file generation, the refactoring followed a deliberate, planned architecture separating Presentation, State, Service, Utility, and Validation layers.
- **Type-Safe Contract Harmonization**: Resolved complex TypeScript mismatches between `fe-zen-arch`'s custom `FormContextData<T>` and standard React Hook Form conventions.
- **Handling Strict Lint Rules**: Diagnosed and resolved strict `@typescript-eslint` rules, such as `no-unnecessary-condition` and `prefer-nullish-coalescing`, ensuring clean type assertions.
- **Graceful Network Edge Cases**: Designed a robust mock service layer equipped with interactive toggles (`serviceTestingControls`) to test loading spinners, empty states, and error alerts.

### Validation Workflow
1. **Incremental Type Checking**: Ran `pnpm exec tsc --incremental` continuously across edits to maintain 0 type errors.
2. **ESLint Verification**: Ran `pnpm exec eslint src/shipping-bills` to ensure 0 lint errors and full compliance with naming conventions.
3. **Production Build**: Executed `pnpm build` to verify that Vite / Rolldown successfully transforms all chunks without bundling errors.
4. **Dev Server Verification**: Verified the live application server running on `http://localhost:5173/`.

### Key Learnings
- In enterprise applications with shared component libraries (like `fe-zen-arch`), respecting established form abstraction patterns (`FormContextData`, custom `Select<T>`, and `Dialog`) produces far more maintainable code than trying to rewrite the wheel.
- Separating business calculations into pure, framework-agnostic utility functions makes them immediately testable and reusable across client-side previews, payload generation, and export file builders.

---

## 7. Submission Details

- **Target Collaborator**: `shivam-aajkalbharat`
- **Steps to Submit**:
  1. Create a new **private** GitHub repository:
     ```bash
     git remote set-url origin git@github.com:<your-username>/assignment-01.git
     git push -u origin main
     ```
  2. In your GitHub repository settings, go to **Settings > Collaborators** and invite `shivam-aajkalbharat`.
  3. Share your private repository link in your assignment submission.
