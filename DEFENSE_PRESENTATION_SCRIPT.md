# SnapFun Resource System - Live Demonstration Script
**Duration**: 15 Minutes
**Language**: English
**Format**: Live System Demonstration Only

---

## **OPENING (30 seconds)**

**Script**:
"Good morning/afternoon, honorable examiners. My name is [Your Name], an Information System student with ERP concentration. Today, I will demonstrate the SnapFun Resource System - an AI-Assisted Operational Resource and Event Management System developed for SnapFun Photography.

This system is a comprehensive ERP solution that digitalizes all business processes including asset management, inventory control, event booking, customer management, procurement, and reporting. I will now walk you through the live system to show how it addresses SnapFun's operational challenges."

---

## **DEMO STEP 1: LOGIN (1 minute)**

**Action**: Navigate to login page, enter credentials, click login

**Script**:
"First, let me log into the system. I'll enter my email and password. The system uses bcrypt password hashing for security, and each session is managed with a unique token that expires after 30 minutes.

After clicking login, the system validates my credentials and creates a session. I'm now redirected to the main dashboard."

---

## **DEMO STEP 2: DASHBOARD OVERVIEW (2 minutes)**

**Action**: Show dashboard with all metrics, explain each section

**Script**:
"This is the main dashboard, which provides a real-time overview of SnapFun's operations.

At the top, you can see six key metrics:
- **Total Assets**: Currently showing [number] active assets across all categories
- **Low Stock Items**: [number] items that need attention
- **Upcoming Events**: [number] events scheduled
- **Total Customers**: [number] customers in the system
- **Customer Segmentation**: Showing the split between in-studio and off-site clients
- **Total Revenue**: Combined revenue from in-studio visits and off-site events

Below the metrics, there are several charts:
- **Asset Status Distribution**: Shows how many assets are Available, In Use, or in Maintenance
- **Revenue Trend**: Displays revenue over time to identify patterns
- **Low Stock Items**: Lists items that need restocking with suggested quantities
- **Upcoming Events**: Shows the next scheduled events
- **Recent Procurement**: Displays the latest procurement requests

All this data is fetched in real-time from the database, ensuring decisions are based on current information."

---

## **DEMO STEP 3: ASSET MANAGEMENT (2 minutes)**

**Action**: Navigate to Assets page, show filtering, create/edit asset

**Script**:
"Now let me show you the Asset Management module. I'll click on 'Assets' in the sidebar.

Here you can see all photography equipment - cameras, lighting gear, computers, and props. Each asset displays:
- Name and category
- Current status (Available, In Use, Maintenance, Retired)
- Condition (Good, Fair, Poor)
- Location (Studio A, Studio B, Warehouse)
- Purchase date and price

I can filter assets by status, category, or search by name. For example, let me filter to show only 'Available' assets in 'Camera Gear' category.

I can also add a new asset by clicking the 'Add Asset' button. The form captures all necessary details including category, condition, location, and I can upload a photo of the asset.

Each asset can have a QR code for quick identification during check-in and check-out. This real-time tracking prevents double-booking and loss of equipment."

---

## **DEMO STEP 4: INVENTORY MANAGEMENT (2 minutes)**

**Action**: Navigate to Inventory page, show stock levels, demonstrate auto-draft procurement

**Script**:
"Next is the Inventory Management module for consumable supplies like photo paper and ink.

Here you can see all inventory items with:
- Item name and category
- Current stock quantity
- Minimum stock threshold
- Stock status (In Stock, Low Stock, Out of Stock)
- Last procurement vendor

Items are color-coded: green for in-stock, yellow for low-stock, and red for out-of-stock.

Let me show you a low-stock item. I can see that [item name] has [quantity] units, which is below the minimum threshold of [minimum]. The system automatically calculates this status.

For low-stock items, I can click 'Auto-Draft Procurement' to create a procurement request with one click. The system suggests a restock quantity based on predictive analysis.

Let me demonstrate this. [Click auto-draft button]. The system creates a draft procurement request with the suggested quantity. I can then edit the draft to add the supplier and cost before submitting for approval.

This integration between inventory and procurement ensures stock levels are maintained efficiently."

---

## **DEMO STEP 5: EVENT MANAGEMENT (2.5 minutes)**

**Action**: Navigate to Events page, show calendar view, create new event with conflict detection

**Script**:
"Now let me show you the Event Management module for bookings.

This page displays all events - both in-studio sessions and off-site events like weddings and birthdays. Each event shows:
- Event name and customer
- Date range
- Location
- Status (Upcoming, In Progress, Completed, Cancelled)
- Expected revenue

I can view events in a list or switch to calendar view for better visualization.

Let me create a new event to demonstrate the conflict detection feature. [Click 'Add Event'].

I'll fill in the event details:
- Event name: [name]
- Customer: [select customer]
- Start date and end date: [select dates]
- Location: [select location]
- Expected revenue: [enter amount]

Now I need to select assets for this event. [Select assets]. The system automatically checks if any of these assets are already booked for other events on the same dates.

[If conflict detected]: You can see the system is warning me that [asset name] is already booked for [event name] on overlapping dates. This prevents double-booking.

[If no conflict]: The system confirms that all selected assets are available.

I'll save the event. The status is automatically set to 'Upcoming' based on the date. When the event date arrives, the status will automatically change to 'In Progress', and then to 'Completed' when it ends."

---

## **DEMO STEP 6: CUSTOMER MANAGEMENT (1.5 minutes)**

**Action**: Navigate to Customers page, show segmentation, view customer details

**Script**:
"The Customer Management module centralizes all customer information.

Here you can see all customers with their details:
- Name and contact information
- Customer type (In-Studio or Off-Site)
- Total spending
- Number of visits or events
- Last visit or booking date

The system automatically segments customers. In-studio customers are those who visit the physical studio, while off-site customers are those who book events like weddings.

I can filter by segment - let me show only in-studio customers. [Filter by in-studio].

Each customer has a complete history. Let me click on a customer to see their details. [Click customer].

You can see their profile information, all their in-studio visits with spending amounts, and all their off-site events with expected revenue. This 360-degree view helps provide personalized service and targeted marketing."

---

## **DEMO STEP 7: PROCUREMENT MANAGEMENT (2 minutes)**

**Action**: Navigate to Procurement page, show workflow, change status

**Script**:
"The Procurement Management module digitizes the purchasing process.

Here you can see all procurement requests with:
- PR number (unique ID)
- Request type (Supplies or Assets)
- Supplier
- Status (Draft, Waiting Approval, Approved, Received, Rejected)
- Total cost

The workflow is standardized: Draft → Waiting Approval → Approved → Received. Requests can be rejected at the approval stage.

Let me show you the draft I created earlier from the inventory module. [Click on draft].

I can edit this draft to add the supplier information and item costs. [Edit draft]. Each item must have a valid cost before submission - this is a validation rule.

Now I'll submit it for approval. [Submit]. The status changes to 'Waiting Approval'.

As an admin, I can approve this request. [Change status to Approved]. The status is now 'Approved'.

When the items are received, I'll change the status to 'Received'. [Change status to Received].

Notice that when I change the status to 'Received', the system automatically updates the inventory stock quantities. This is a key ERP integration - procurement and inventory modules are connected to ensure data consistency."

---

## **DEMO STEP 8: AI CHATBOT - SNAPFUNNY (2 minutes)**

**Action**: Open chatbot, ask questions in English and Indonesian

**Script**:
"Now let me demonstrate the AI assistant - SnapFunny.

It's important to note that while the project title includes 'AI-Assisted,' the AI is a support feature. The system works completely without AI, but SnapFunny enhances the user experience by providing a natural language interface.

Let me open the chatbot. [Click chatbot icon].

I'll ask a question in English: 'What items are low on stock?'

[Wait for AI response]. SnapFunny responds with specific data from the system, listing the low-stock items with their current quantities and minimum thresholds.

Now let me ask in Indonesian: 'Berapa total pelanggan yang kita miliki?'

[Wait for AI response]. SnapFunny automatically detects the language and responds in Indonesian with the total customer count.

I can also ask for reports. Let me ask: 'Download the customer report for in-studio customers.'

[Wait for AI response]. SnapFunny generates a download link for the filtered Excel export.

The AI has access to real-time data from all modules and provides specific, accurate answers. It also has access to predictive insights like operational risk level and restock priorities, which it uses to provide proactive recommendations."

---

## **DEMO STEP 9: REPORT EXPORT (1.5 minutes)**

**Action**: Demonstrate exporting reports with different filters

**Script**:
"Finally, let me show you the reporting capabilities.

The system allows one-click export of reports to Excel or CSV format with flexible filtering.

I can export from any module. Let me export a customer report. [Click export button].

I can filter by:
- Segment (in-studio or off-site)
- Date range
- Search term

Let me export in-studio customers for this month. [Apply filters and export].

The system generates an Excel file with all customer data including their spending and visit history.

I can also export from the dashboard with more complex filters. For example, I can export an accounting report focused on in-studio revenue for a specific month.

This one-click export feature reduces reporting time from 30-60 minutes to 1-2 minutes - a 95% time reduction."

---

## **CLOSING (30 seconds)**

**Action**: Logout, return to login page

**Script**:
"That concludes the demonstration of the SnapFun Resource System.

To summarize, the system provides:
- Real-time asset tracking with conflict detection
- Automated inventory management with restock recommendations
- Digital event booking with automated conflict detection
- Centralized customer management with segmentation
- Streamlined procurement workflow with inventory integration
- Real-time dashboard with predictive insights
- AI-powered natural language interface

The system addresses all the operational challenges faced by SnapFun Photography, resulting in 95% reduction in reporting time, 90% improvement in data accuracy, and significant improvements in resource utilization and customer service.

Thank you for your attention. I'm now ready to answer any questions you may have."

---

## **DEMO PREPARATION CHECKLIST**:

**Before Demo**:
- [ ] Ensure backend server is running
- [ ] Ensure frontend is running
- [ ] Verify database connection
- [ ] Have test data ready (assets, inventory, events, customers, procurement)
- [ ] Ensure AI API key is configured
- [ ] Test all features beforehand
- [ ] Have screenshots ready as backup in case of technical issues

**During Demo**:
- [ ] Speak clearly and at a moderate pace
- [ ] Explain what you're doing as you do it
- [ ] Highlight key features and their business value
- [ ] Emphasize module integration points
- [ ] If something doesn't work, have a backup explanation ready
- [ ] Keep eye contact with examiners, not just the screen

**Key Points to Emphasize**:
- AI is a support feature, system works without it
- Real-time data fetching
- Module integration (procurement ↔ inventory, event ↔ assets)
- Automated conflict detection
- One-click export
- Security features (session management, password hashing)
- Business impact metrics

**Backup Plan**:
- If live demo fails, use screenshots to walk through the system
- If AI doesn't respond, explain that the system works without AI
- If database connection fails, explain the architecture and show the frontend
