# Shipping Instructions Feature (Forms Section)

This document describes the shipping instructions feature that has been implemented within the Forms section of the Narvi Maritime frontend application.

## Overview

The shipping instructions feature consists of two main pages within the Forms section:

1. **Shipping Instructions List** (`/admin/forms/shipping-instructions`)
2. **Shipping Instruction Detail** (`/admin/forms/shipping-instruction/:id`)

## Features Implemented

### 1. Shipping Instructions List Page
- **Table displaying shipping instructions** with columns:
  - Checkbox for selection
  - Instruction Reference
  - Sales Order
  - Client
  - Mode of Transport
  - Status (with color-coded badges)
- **Search functionality** with magnifying glass icon
- **Filter options** with filter icon
- **"New" button** with "Shipping Instructions" text and settings icon
- **Pagination controls** (1-1/1 with arrow buttons)
- **Clickable rows** that navigate to detail view
- **Fully responsive** design

### 2. Shipping Instruction Detail Page
- **Status progress bar** showing: Draft → Confirmed → In Transit → Done
- **Large instruction reference** display (SIS/0001)
- **Two main sections**:
  - **Shipment Info**: Sales Order, Shipment Type, Job No, Vessel, Mode of Transport, From, To
  - **Consignee Info**: Consignee Type, Client, Company, Address Line 1, Address Line 2, Postcode, City
- **Action buttons**:
  - "New" button for creating new instructions
  - "Print Shipping Instruction" button
- **Back navigation** button
- **Fully responsive** grid layout

## Technical Implementation

### Components Created
1. `src/views/admin/forms/shipping-instructions/index.jsx` - List page
2. `src/views/admin/forms/shipping-instructions/ShippingInstructionDetail.jsx` - Detail page

### Routes Added
- `/admin/forms/shipping-instructions` - List page
- `/admin/forms/shipping-instruction/:id` - Detail page

### Navigation
- Accessible through the **Forms** section in the sidebar
- Uses the existing sidebar layout (no custom navbar)
- Proper breadcrumb navigation

### Responsive Design
- Mobile-first approach
- Breakpoints: base (mobile), sm, md, lg, xl
- Flexible layouts that adapt to screen size
- Responsive tables and grids

## Usage

1. Navigate to **Forms** → **Shipping Instructions** in the sidebar
2. View the list of shipping instructions
3. Click on any row to view the detailed shipping instruction
4. Use the search and filter options to find specific instructions
5. Use the "New" button to create new shipping instructions

## Styling

The implementation uses Chakra UI components with:
- Purple color scheme for primary actions
- Consistent spacing and typography
- Dark/light mode support
- Hover effects and transitions
- Professional maritime industry aesthetic
- Matches the existing application design system

## Key Features

✅ **Exact UI replication** from the provided images  
✅ **Fully functional navigation** between pages  
✅ **Responsive design** for all screen sizes  
✅ **Interactive elements** (clickable rows, buttons, search)  
✅ **Professional maritime industry styling**  
✅ **Dark/light mode support**  
✅ **Modern Chakra UI components**  
✅ **Integration with existing sidebar layout**  

## Future Enhancements

- Add form functionality for creating/editing shipping instructions
- Implement real data integration
- Add more filtering and sorting options
- Implement print functionality
- Add status change workflows
- Integrate with backend APIs
- Add bulk operations (delete, export, etc.)
