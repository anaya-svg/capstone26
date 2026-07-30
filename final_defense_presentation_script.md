# SnapFun Resource System - Final Defense Presentation Script
**Duration: 15 Minutes Maximum**
**Format: Live System Demonstration with Business Flow Narrative**

---

## A. Log In & Registration (1.5 minutes)

**[Screen: Login Page]**

"Good morning/afternoon. Today I'll be demonstrating the SnapFun Resource System - a comprehensive business management solution designed specifically for photo booth and event service operations.

Let me start by showing you our secure access portal. As you can see, we have two distinct entry points: one for regular users and another for admin users. This separation ensures proper access control and security.

For new team members, registration is straightforward. Let me show you the admin registration process. Notice here that admin registration requires a unique company code - this prevents unauthorized access and ensures only authorized personnel can register as administrators.

Once registered, the user simply logs in with their credentials. The system authenticates and routes them to the appropriate dashboard based on their role."

**[Demo: Register admin account with company code, then log in]**

---

## B. Dashboard (1.5 minutes)

**[Screen: Dashboard after login]**

"This is the Dashboard - your command center. This isn't just a collection of numbers; it's a strategic view of your entire operation in real-time.

Here you can see key performance indicators at a glance: total revenue, active events, inventory status, and upcoming activities. The dashboard is designed to give management immediate visibility into business health without having to dig through multiple menus.

The cards you see here - AI Assisted Stock & Demand Predictor, AI Financial Insights & Recommendations - these aren't static reports. They're intelligent, data-driven insights that help you make proactive decisions rather than reactive ones. We'll explore these in more detail shortly.

This dashboard is vital because it transforms raw data into actionable business intelligence, saving management time and enabling faster, more informed decision-making."

---

## C. AI SnapFunny (2 minutes)

**[Screen: Dashboard, then SnapFunny chatbot]**

"Now, let me introduce SnapFunny - our AI-powered assistant. SnapFunny is more than just a chatbot; it's an intelligent business advisor that understands your operation.

SnapFunny can answer questions about your data, provide predictions, and even generate custom reports. For example, you can ask: 'Predict stock for the next 30 days' or 'Which items need restocking now?' - and SnapFunny will analyze your inventory data, upcoming events, and historical patterns to give you actionable recommendations.

But SnapFunny's capabilities extend beyond the chatbot. Notice these dashboard cards: 'AI Assisted Stock & Demand Predictor' and 'AI Financial Insights & Recommendations.' These are specialized AI modules that continuously analyze your data.

The Stock & Demand Predictor looks at your inventory levels, upcoming events, and historical consumption patterns to forecast demand and alert you to potential shortages before they become problems.

The Financial Insights module analyzes revenue trends, customer segments, and procurement costs to provide recommendations on optimizing profitability and identifying growth opportunities.

Together, these AI capabilities transform SnapFun from a data management system into an intelligent business partner."

**[Demo: Open SnapFunny, show suggested prompts, demonstrate a quick query]**

---

## D. Assets (2 minutes)

**[Screen: Assets menu]**

"Let's move to the Assets module. This is where we manage all physical equipment - cameras, lighting, computers, props - everything that makes our operations possible.

Think of assets as the backbone of our service business. Each piece of equipment represents significant investment, and tracking them efficiently is crucial for both operational efficiency and asset protection.

Let me add a new asset. Notice the 'Generate QR Barcode' option. This is optional but highly recommended. When enabled, the system generates a unique QR code for each asset. This code can be printed and attached to the physical equipment, enabling quick scanning and tracking.

Now, let me explain the asset statuses, which tell us exactly where each asset is at any moment:

- **Available**: The asset is in the studio, ready for use
- **In Use**: The asset is currently deployed at an off-site event or booth
- **Maintenance**: The asset is under repair or servicing

Once registered, assets appear in the overview table. Clicking 'View' shows the generated QR code. In practice, you'd print this and attach it to the physical asset.

Now, watch this - the 'Scan QR' button. This is where the physical and digital worlds connect. When you scan an asset's QR code, you get instant access to its current data and can quickly update its status, location, or condition. This field-ready capability means staff can update asset information on-site, in real-time, without returning to a computer.

For reporting, you can download Excel files with the 'Download Excel' button. You can filter by category, status, or other criteria. Even better, you can ask SnapFunny to generate custom Excel exports with exactly the columns you need - for example, 'Download Excel with only asset name and status.'"

**[Demo: Add new asset with QR generation, show view modal, demonstrate scan QR concept, show download options]**

---

## E. Inventory (2 minutes)

**[Screen: Inventory menu]**

"The Inventory module manages all consumable supplies - photo paper, backdrops, props, cables, and other materials that get consumed during operations.

This is critical because running out of key supplies during an event is unacceptable. The system helps prevent this through intelligent tracking and alerts.

Notice the filter options here - you can quickly view items by stock status: In Stock, Low Stock, or No Stock. This immediate visibility helps staff prioritize restocking efforts.

Let me create a new inventory item. Here's an important business rule: when adding new items to the system, you might not have purchased them yet. In that case, you can leave the Stock Quantity and Vendor fields blank. Later, when the item is procured through our Procurement module, these fields will auto-fill when the procurement is completed. This ensures data consistency across the system.

For Units of Measure (UoM) and Vendors, you can't enter arbitrary values - they must come from the master data. If you need a new UoM or Vendor, you add them through the dedicated 'Add UoM' or 'Add Vendor' buttons. This maintains data integrity and prevents inconsistencies.

Now, look at this card: 'Low Stock Alert - Restock Needed.' This is an intelligent feature that automatically identifies items running low and presents them in one place. Even better, the 'Auto Draft' button - when clicked, it automatically creates a draft procurement request for these items. This streamlines the restocking process and reduces manual work."

**[Demo: Create new inventory item, show UoM/Vendor selection, demonstrate Low Stock Alert and Auto Draft]**

---

## F. Events & Booths (2 minutes)

**[Screen: Events & Booths menu]**

"The Events & Booths module is the heart of our business operations. This is where we manage all events - both in-studio services and off-site booth bookings.

This module provides a timeline view of all events categorized by status: Upcoming, In Progress, Completed, or Cancelled. This timeline view helps with resource planning and capacity management.

Let me create a new event. Notice two critical business rules here:

First, the Customer field - you can't type arbitrary names. You must select from customers registered in our Customer module. This ensures all events are linked to actual customer records.

Second, the Assets section - when assigning assets to an event, the system performs intelligent conflict detection. If an asset is already assigned to another event during the same time period, and the asset quantity is limited to one, the system will reject the assignment and alert you that the asset is unavailable. This prevents double-booking and operational conflicts.

This conflict detection is crucial for maintaining service quality and avoiding disappointing customers due to equipment unavailability.

When an event status changes to 'In Progress,' something important happens automatically - the status of all assigned assets changes to 'In Use.' This automatic status update ensures the Assets module always reflects the current operational reality."

**[Demo: Create new event, show customer selection, demonstrate asset conflict detection, explain status automation]**

---

## G. Internal Calendar (1 minute)

**[Screen: Internal Calendar]**

"The Internal Calendar provides a comprehensive view of all SnapFun activities. It automatically retrieves data from the Events & Booths module, giving you a unified calendar view of all scheduled events.

This is valuable for operational planning and team coordination. Everyone can see what's happening and when, in a familiar calendar format.

Users can also add other activities manually - team meetings, maintenance schedules, training sessions, or any other business activities. This makes the Internal Calendar a complete operational planning tool, not just an event viewer."

**[Demo: Show calendar view, demonstrate adding a custom activity]**

---

## H. Procurement (2 minutes)

**[Screen: Procurement menu]**

"The Procurement module manages all purchasing activities - whether for new assets or consumable supplies. This is where supply chain management happens.

When you need to purchase items, you create a Purchase Request (PR) by clicking 'Add New Request.' The system guides you through the process with an important classification step: you must specify whether you're purchasing Supplies (inventory items) or Assets. This classification ensures the system retrieves the correct master data and applies appropriate workflows.

For item selection, you can't enter arbitrary names - the system retrieves data from the relevant master data based on your classification. This maintains data integrity and prevents purchasing items that don't exist in your catalog.

Once submitted, the PR enters an approval workflow. Admin users with purchasing authority can review and approve requests. When approved, the PR becomes a Purchase Order (PO), and the purchasing staff can proceed with the vendor.

When items arrive, SnapFun performs quality inspection. If everything meets specifications, the admin clicks 'Received,' and the inventory is automatically updated. If items don't pass inspection, the admin can reject the shipment and document the reason - this creates a quality control record and triggers the necessary follow-up actions.

This end-to-end procurement workflow ensures accountability, quality control, and seamless inventory updates."

**[Demo: Create new PR, show classification, explain approval workflow, demonstrate received/rejected process]**

---

## I. Customers (1.5 minutes)

**[Screen: Customers menu]**

"The Customers module manages all client relationships. Customers are categorized into two segments: In Studio (walk-in customers) and Off Site (event/booth bookings).

Adding new customers is straightforward - click 'Add New Customer' and fill in the details. Once registered, you can assign customers to the appropriate segment based on their service preference.

For In Studio customers, when they visit for services, you create a transaction record by selecting the desired in-studio package. This records the service delivery and revenue.

For Off Site customers, when they book SnapFun for events or booths, you assign them to the Off Site segment. Once assigned, their names become available in the Events & Booths module for event creation.

At the top of this screen, you can track revenue from both segments - In Studio and Off Site. This revenue tracking helps analyze business performance across different service lines.

The 'Accounting Report' button provides comprehensive transaction recaps - whether from customer activities or procurement purchasing. This supports financial analysis and reporting.

For promotional activities, the 'Manage Promo & Discount' button opens the promotion master data. Once activated, promo codes can be applied to both in-studio transactions and off-site events, giving you flexibility in pricing strategies."

**[Demo: Add new customer, assign to segment, show revenue tracking, mention promo management]**

---

## J. User Management (0.5 minutes)

**[Screen: User Management menu]**

"Finally, the User Management module - accessible only to admin users. This is where system administrators can view all registered users, control user roles, deactivate accounts, or remove users as needed.

This centralized user management ensures proper access control and security across the entire SnapFun Resource System."

**[Demo: Show user list, mention role control options]**

---

## Closing (30 seconds)

"In summary, the SnapFun Resource System is more than just a management tool - it's an integrated business platform that connects all aspects of photo booth and event operations. From asset tracking to inventory management, from event scheduling to procurement workflows, and from customer relationships to financial insights - everything works together seamlessly.

The AI capabilities through SnapFunny elevate this from a data management system to an intelligent business advisor, helping you make better decisions faster.

Thank you for your time. I'm happy to answer any questions about specific features or workflows."

---

## Timing Notes for Presenter:
- Total estimated time: 15 minutes
- Each section includes demo time within the stated duration
- Adjust pacing based on actual demonstration speed
- Keep explanations concise and business-focused
- Emphasize the "why" (business value) over the "how" (technical details)
- Maintain conversational tone throughout
