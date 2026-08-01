# SnapFun Resource System - Final Defense Cue Cards
**Duration: 15 Minutes Maximum**
**Format: Detailed Presentation Cues with Elaboration Guidance**

---

## A. Log In & Registration (1.5 minutes)

**[Screen: Login Page]**

**Opening Statement:**
- Introduce SnapFun Resource System as comprehensive business management solution
- Specifically designed for photo booth and event service operations

**Access Portal:**
- Show two distinct entry points: Regular User + Admin User
- Explain purpose: proper access control and security through role separation

**Registration Process:**
- New users must register first before accessing system
- Demo admin registration process
- Highlight unique company code requirement for admin registration
- Explain security benefit: prevents unauthorized admin access
- Only authorized personnel can register as administrators

**Login Process:**
- After registration, user logs in with credentials
- System authenticates and routes to appropriate dashboard based on role
- Show role-based routing in action

**[Demo: Register admin with company code, then log in]**

---

## B. Dashboard (1.5 minutes)

**[Screen: Dashboard after login]**

**Dashboard Definition:**
- Dashboard = command center for entire operation
- Not just numbers - strategic view in real-time

**Key Performance Indicators:**
- Point out each KPI: total revenue, active events, inventory status, upcoming activities
- Explain value: immediate visibility into business health
- Benefit: no need to dig through multiple menus for insights

**AI Cards (Preview):**
- Show "AI Assisted Stock & Demand Predictor" card
- Show "AI Financial Insights & Recommendations" card
- Explain: these are NOT static reports
- They are intelligent, data-driven insights
- Enable proactive decisions vs reactive decisions
- Mention: will explore in detail shortly

**Business Value:**
- Dashboard transforms raw data into actionable business intelligence
- Saves management time
- Enables faster, more informed decision-making

---

## C. AI SnapFunny (2 minutes)

**[Screen: Dashboard, then SnapFunny chatbot]**

**SnapFunny Introduction:**
- SnapFunny = AI-powered assistant
- More than chatbot - intelligent business advisor
- Understands your operation context

**Core Capabilities:**
- Answer questions about your data
- Provide predictions
- Generate custom reports

**Example Queries (elaborate):**
- "Predict stock for the next 30 days" - explain what this does
- "Which items need restocking now?" - explain the analysis
- SnapFunny analyzes: inventory levels + upcoming events + historical patterns
- Returns actionable recommendations

**Dashboard AI Modules:**
- **Stock & Demand Predictor card:**
  - Continuously analyzes inventory levels
  - Looks at upcoming events
  - Examines historical consumption patterns
  - Forecasts demand
  - Alerts to potential shortages before they become problems

- **Financial Insights card:**
  - Analyzes revenue trends
  - Examines customer segments
  - Reviews procurement costs
  - Provides optimization recommendations
  - Identifies growth opportunities

**Business Transformation:**
- AI capabilities transform system from data management to intelligent business partner
- Elevates from tool to advisor

**[Demo: Open SnapFunny, show suggested prompts, demonstrate quick query]**

---

## D. Assets (2 minutes)

**[Screen: Assets menu]**

**Module Purpose:**
- Assets = physical equipment management
- Examples: cameras, lighting, computers, props
- Backbone of service business
- Each asset = significant investment
- Tracking crucial for operational efficiency + asset protection

**Add New Asset Demo:**
- Click "Add New Asset"
- Fill in asset details
- Highlight "Generate QR Barcode" option
- Explain: optional but highly recommended
- When enabled: generates unique QR code per asset
- Practical use: print + attach to physical equipment
- Benefit: enables quick scanning and tracking

**Asset Statuses (explain each):**
- **Available**: Asset in studio, ready for use
- **In Use**: Asset deployed at off-site event/booth
- **Maintenance**: Asset under repair/servicing

**Overview Table:**
- Assets appear in table after registration
- Click "View" button → shows generated QR code
- In practice: print QR, attach to physical asset

**Scan QR Feature:**
- Show "Scan QR" button
- Explain: physical-digital connection
- When scanned: instant access to current asset data
- Can quickly update: status, location, condition
- Field-ready capability: staff update on-site, real-time
- No need to return to computer

**Download Excel:**
- Show "Download Excel" button
- Can filter by: category, status, other criteria
- Advanced: ask SnapFunny for custom exports
- Example: "Download Excel with only asset name and status"
- Flexibility in reporting

**[Demo: Add new asset with QR generation, show view modal, demonstrate scan QR concept, show download options]**

---

## E. Inventory (2 minutes)

**[Screen: Inventory menu]**

**Module Purpose:**
- Inventory = consumable supplies management
- Examples: photo paper, backdrops, props, cables
- Critical importance: prevent stockouts during events
- Running out during event = unacceptable

**Filter Options:**
- Show filter buttons: In Stock, Low Stock, No Stock
- Benefit: immediate visibility
- Helps staff prioritize restocking efforts

**Create New Inventory Item Demo:**
- Click "Add New Item"
- Fill in item details

**Business Rule - New Items:**
- Important: when adding new items, might not have purchased yet
- Can leave Stock Quantity + Vendor fields blank
- Later: when procured through Procurement module
- These fields auto-fill when procurement completed
- Benefit: ensures data consistency across system

**UoM + Vendor Validation:**
- Cannot enter arbitrary values
- Must come from master data
- If need new UoM/Vendor: use dedicated "Add UoM" or "Add Vendor" buttons
- Benefit: maintains data integrity, prevents inconsistencies

**Low Stock Alert Card:**
- Show "Low Stock Alert - Restock Needed" card
- Explain: automatically identifies low/no stock items
- Benefit: one place visibility
- Highlight "Auto Draft" button
- When clicked: automatically creates draft procurement request
- Benefit: streamlines restocking, reduces manual work

**[Demo: Create new inventory item, show UoM/Vendor selection, demonstrate Low Stock Alert and Auto Draft]**

---

## F. Events & Booths (2 minutes)

**[Screen: Events & Booths menu]**

**Module Purpose:**
- Events & Booths = heart of business operations
- Manages: in-studio services + off-site booth bookings
- Timeline view by status: Upcoming, In Progress, Completed, Cancelled
- Benefits: resource planning + capacity management

**Create New Event Demo:**
- Click "Add New Event"
- Fill in event details

**Business Rule 1 - Customer Field:**
- Show Customer field
- Cannot type arbitrary names
- Must select from registered customers in Customer module
- Benefit: ensures events linked to actual customer records
- Maintains data integrity

**Business Rule 2 - Assets + Conflict Detection:**
- Show Assets section
- When assigning assets to event
- System performs intelligent conflict detection
- Example scenario:
  - Asset assigned to Event A (time period)
  - Event B tries same asset (same time, qty=1)
  - System rejects + alerts: asset unavailable
- Benefit: prevents double-booking, operational conflicts
- Crucial for: maintaining service quality, avoiding customer disappointment

**Automatic Status Update:**
- Explain: when event status → "In Progress"
- Something happens automatically
- Assigned assets → "In Use" (automatic)
- Benefit: Assets module always reflects current operational reality
- No manual updates needed

**[Demo: Create new event, show customer selection, demonstrate asset conflict detection, explain status automation]**

---

## G. Internal Calendar (1 minute)

**[Screen: Internal Calendar]**

**Module Purpose:**
- Internal Calendar = comprehensive activity view
- Auto-retrieves data from Events & Booths module
- Unified calendar view of all scheduled events

**Business Benefits:**
- Operational planning
- Team coordination
- Everyone sees what's happening and when
- Familiar calendar format

**Add Custom Activities:**
- Can add activities manually beyond events
- Examples: team meetings, maintenance schedules, training sessions
- Any business activities
- Benefit: complete operational planning tool
- Not just event viewer

**[Demo: Show calendar view, demonstrate adding a custom activity]**

---

## H. Procurement (2 minutes)

**[Screen: Procurement menu]**

**Module Purpose:**
- Procurement = supply chain management
- Purchases: new assets + consumable supplies
- Where purchasing workflow happens

**Create New Request Demo:**
- Click "Add New Request" to create PR

**Classification Step:**
- System guides through classification
- Must specify: Supplies (inventory items) OR Assets
- Benefit: ensures correct master data retrieval
- Applies appropriate workflows

**Item Selection Validation:**
- Cannot enter arbitrary item names
- System retrieves from relevant master data
- Based on classification (Supplies vs Assets)
- Benefit: maintains data integrity
- Prevents purchasing items not in catalog

**Approval Workflow:**
- After submission, PR enters approval workflow
- Admin users with purchasing authority review
- When approved: PR becomes PO (Purchase Order)
- Purchasing staff proceeds with vendor

**Quality Inspection on Arrival:**
- Items arrive → SnapFun performs quality inspection
- If meets specifications: admin clicks "Received"
- Inventory automatically updated
- If fails inspection: admin rejects + documents reason
- Benefit: quality control record + follow-up triggers

**End-to-End Value:**
- Ensures accountability
- Quality control
- Seamless inventory updates

**[Demo: Create new PR, show classification, explain approval workflow, demonstrate received/rejected process]**

---

## I. Customers (1.5 minutes)

**[Screen: Customers menu]**

**Module Purpose:**
- Customers = client relationship management
- Two segments:
  - **In Studio**: walk-in customers
  - **Off Site**: event/booth bookings

**Add New Customer Demo:**
- Click "Add New Customer"
- Fill in customer details
- Assign to appropriate segment based on service preference

**In Studio Process:**
- Customer visits for services
- Create transaction record
- Select in-studio package
- Records: service delivery + revenue

**Off Site Process:**
- Customer books SnapFun for events/booths
- Assign to Off Site segment
- Once assigned: name available in Events & Booths (Customer field)
- Links customer to event records

**Revenue Tracking:**
- Show top of screen: In Studio revenue + Off Site revenue
- Benefit: analyze business performance by service line
- Compare performance across segments

**Accounting Report:**
- Show "Accounting Report" button
- Provides: transaction recaps
- Covers: customer activities OR procurement purchasing
- Benefit: financial analysis + reporting

**Manage Promo & Discount:**
- Show "Manage Promo & Discount" button
- Opens promotion master data
- Once activated: promo codes available
- Can apply to: in-studio transactions OR off-site events
- Optional usage
- Benefit: pricing strategy flexibility

**[Demo: Add new customer, assign to segment, show revenue tracking, mention promo management]**

---

## J. User Management (0.5 minutes)

**[Screen: User Management menu]**

**Module Purpose:**
- User Management = admin-only module
- Centralized access control + security

**Capabilities:**
- View all registered users
- Control user roles
- Deactivate accounts
- Remove users
- Benefit: proper access control across entire system

**[Demo: Show user list, mention role control options]**

---

## Closing (30 seconds)

**Summary Points:**
- SnapFun Resource System = integrated business platform
- Connects all operation aspects
- Flow: asset tracking → inventory → events → procurement → customers → finance
- AI capabilities (SnapFunny) = intelligent business advisor
- Benefit: better decisions, faster
- Transformation: data management → business intelligence

**Thank You + Q&A**
- Thank audience for time
- Open to questions about specific features or workflows

---

## Timing Notes:
- Total: 15 minutes
- Each section includes demo time
- Adjust pacing based on actual speed
- Use cues as elaboration guide
- Focus on business value (why) over technical details (how)
- Maintain conversational flow
- Speak naturally, don't read verbatim
