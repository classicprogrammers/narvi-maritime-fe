import React from "react";

import { Icon } from "@chakra-ui/react";
import {
  MdBarChart,
  MdPerson,
  MdLock,
  MdOutlineShoppingCart,
  MdDashboard,
  MdContacts,
  MdDescription,
  MdLocalShipping,
  MdInventory,
  MdAssignment,
  MdPeople,
  MdBusiness,
  MdRateReview,
  MdList,
  MdDirectionsBoat,
  MdConfirmationNumber,
  MdDeliveryDining,
} from "react-icons/md";

// Admin Imports
import MainDashboard from "views/admin/default";
import NFTMarketplace from "views/admin/marketplace";
import Profile from "views/admin/profile";
import DataTables from "views/admin/dataTables";

// Contacts Imports
import Customer from "views/admin/contacts/Customer";
import Vendors from "views/admin/contacts/Vendors";

// Auth Imports
import SignInCentered from "views/auth/signIn";

const routes = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "/default",
    icon: <Icon as={MdDashboard} width='20px' height='20px' color='inherit' />,
    component: MainDashboard,
  },
  {
    name: "Contacts",
    layout: "/admin",
    icon: <Icon as={MdContacts} width='20px' height='20px' color='inherit' />,
    submenu: [
      {
        name: "Customer",
        path: "/contacts/customer",
        icon: <Icon as={MdPeople} width='20px' height='20px' color='inherit' />,
        component: Customer,
      },
      {
        name: "Vendors",
        path: "/contacts/vendors",
        icon: <Icon as={MdBusiness} width='20px' height='20px' color='inherit' />,
        component: Vendors,
      },
    ],
  },
  {
    name: "Quotations",
    layout: "/admin",
    icon: <Icon as={MdDescription} width='20px' height='20px' color='inherit' />,
    submenu: [
      {
        name: "Quotations",
        path: "/quotations/list",
        icon: <Icon as={MdList} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
      {
        name: "Rate List",
        path: "/quotations/rate-list",
        icon: <Icon as={MdRateReview} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
    ],
  },
  {
    name: "Shipping Orders",
    layout: "/admin",
    path: "/shipping-orders",
    icon: <Icon as={MdLocalShipping} width='20px' height='20px' color='inherit' />,
    component: MainDashboard, // Placeholder component
  },
  {
    name: "Stock List",
    layout: "/admin",
    path: "/stock-list",
    icon: <Icon as={MdInventory} width='20px' height='20px' color='inherit' />,
    component: MainDashboard, // Placeholder component
  },
  {
    name: "Forms",
    layout: "/admin",
    icon: <Icon as={MdAssignment} width='20px' height='20px' color='inherit' />,
    submenu: [
      {
        name: "Shipping Instructions",
        path: "/forms/shipping-instructions",
        icon: <Icon as={MdDirectionsBoat} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
      {
        name: "Shipping Confirmation",
        path: "/forms/shipping-confirmation",
        icon: <Icon as={MdConfirmationNumber} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
      {
        name: "Delivery Instructions",
        path: "/forms/delivery-instructions",
        icon: <Icon as={MdDeliveryDining} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
      {
        name: "Delivery Confirmation",
        path: "/forms/delivery-confirmation",
        icon: <Icon as={MdConfirmationNumber} width='20px' height='20px' color='inherit' />,
        component: MainDashboard, // Placeholder component
      },
    ],
  },
  {
    name: "NFT Marketplace",
    layout: "/admin",
    path: "/nft-marketplace",
    icon: (
      <Icon
        as={MdOutlineShoppingCart}
        width='20px'
        height='20px'
        color='inherit'
      />
    ),
    component: NFTMarketplace,
    secondary: true,
  },
  {
    name: "Data Tables",
    layout: "/admin",
    icon: <Icon as={MdBarChart} width='20px' height='20px' color='inherit' />,
    path: "/data-tables",
    component: DataTables,
  },
  {
    name: "Profile",
    layout: "/admin",
    path: "/profile",
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    component: Profile,
  },
  {
    name: "Sign In",
    layout: "/auth",
    path: "/sign-in",
    icon: <Icon as={MdLock} width='20px' height='20px' color='inherit' />,
    component: SignInCentered,
  },
  // {
  //   name: "RTL Admin",
  //   layout: "/rtl",
  //   path: "/rtl-default",
  //   icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
  //   component: RTL,
  // },
];

export default routes;
