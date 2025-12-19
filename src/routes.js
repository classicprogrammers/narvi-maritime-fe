import React from "react";

import { Icon } from "@chakra-ui/react";
import {
  MdPerson,
  MdLock,
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
  MdSettings,
  MdGroups,
  MdLocationOn,
  MdAttachMoney,
  MdStraighten,
  MdPublic,
  MdPlace,
  MdPhone,
  MdAdd,
  MdStorage,
  MdHistory,
} from "react-icons/md";

// Admin Imports
import MainDashboard from "views/admin/default";

// Contacts Imports
import Customer from "views/admin/contacts/Customer";
import Vendors from "views/admin/contacts/Vendors";
import CustomerRegistration from "views/admin/customer-registration";
import VendorRegistration from "views/admin/vendor-registration";
import ClientDetail from "views/admin/contacts/ClientDetail";
import AgentDetail from "views/admin/contacts/AgentDetail";
import Phonebook from "views/admin/phonebook";

// Quotations Imports
import Quotations from "views/admin/quotations";
import RateList from "views/admin/quotations/rate-list";
import QuotationEditor from "views/admin/quotations/QuotationEditor";
import QuotationDetail from "views/admin/quotations/QuotationDetail";
import ShippingOrder from "views/admin/shipping-order";

// Stock List Imports
import StockList from "views/admin/stock-list";
import StockForm from "views/admin/stock-list/StockForm";
import Stocks from "views/admin/stock-list/Stocks";
import StockDBMainEdit from "views/admin/stock-list/StockDBMainEdit";
import NewStockItem from "views/admin/stock-list/NewStockItem";

// Forms Imports
import ShippingInstructions from "views/admin/forms/shipping-instructions";
import ShippingInstructionDetail from "views/admin/forms/shipping-instructions/ShippingInstructionDetail";
import DeliveryInstructions from "views/admin/forms/delivery-instructions";
import DeliveryInstructionDetail from "views/admin/forms/delivery-instructions/DeliveryInstructionDetail";
import DeliveryConfirmation from "views/admin/forms/delivery-confirmation";
import ShippingConfirmation from "views/admin/forms/shipping-confirmation";


// Configurations Imports
import Groups from "views/admin/configurations/groups";
import Locations from "views/admin/configurations/locations";
import Currencies from "views/admin/configurations/currencies";
import Countries from "views/admin/configurations/countries";
import Vessels from "views/admin/configurations/vessels";
import VesselDetail from "views/admin/configurations/VesselDetail";
import UOM from "views/admin/configurations/uom";
import Destinations from "views/admin/configurations/destinations";
import Suppliers from "views/admin/configurations/suppliers";
import Warehouses from "views/admin/configurations/warehouses";

// Auth Imports
import SignInCentered from "views/auth/signIn";
import ForgotPassword from "views/auth/forgotPassword";
import SignUp from "views/auth/signUp";

// Users
import Users from "views/admin/users";
import HistoryLogs from "views/admin/history-logs";

const routes = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "/default",
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: MainDashboard,
  },
  {
    name: "Contacts",
    layout: "/admin",
    icon: <Icon as={MdContacts} width="20px" height="20px" color="inherit" />,
    submenu: [
      {
        name: "Client",
        path: "/contacts/customer",
        icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
        component: Customer,
        exact: true,
      },

      {
        name: "Agents",
        path: "/contacts/agents",
        icon: (
          <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />
        ),
        component: Vendors,
        exact: true,
      },
      {
        name: "Phonebook",
        path: "/contacts/phonebook",
        icon: <Icon as={MdPhone} width="20px" height="20px" color="inherit" />,
        component: Phonebook,
        exact: true,
      },
    ],
  },
  {
    name: "Quotations",
    layout: "/admin",
    icon: (
      <Icon as={MdDescription} width="20px" height="20px" color="inherit" />
    ),
    submenu: [
      {
        name: "Quotations",
        path: "/quotations/list",
        icon: <Icon as={MdList} width="20px" height="20px" color="inherit" />,
        component: Quotations,
      },
      {
        name: "Rate List",
        path: "/quotations/rate-list",
        icon: (
          <Icon as={MdRateReview} width="20px" height="20px" color="inherit" />
        ),
        component: RateList,
      },
    ],
  },
  {
    name: "Shipping Orders",
    layout: "/admin",
    path: "/shipping-orders",
    icon: (
      <Icon as={MdLocalShipping} width="20px" height="20px" color="inherit" />
    ),
    component: ShippingOrder,
  },
  {
    name: "Stock List",
    layout: "/admin",
    icon: <Icon as={MdInventory} width="20px" height="20px" color="inherit" />,
    submenu: [
      {
        name: "StockDB Main",
        path: "/stock-list/main-db",
        icon: <Icon as={MdStorage} width="20px" height="20px" color="inherit" />,
        component: StockList,
        adminOnly: true, // Only show to admin users
      },
      {
        name: "Add Stock",
        path: "/stock-list/add-stock",
        icon: <Icon as={MdAdd} width="20px" height="20px" color="inherit" />,
        component: NewStockItem,
      },
      {
        name: "Stocklist View/Edit",
        path: "/stock-list/stocks",
        icon: <Icon as={MdList} width="20px" height="20px" color="inherit" />,
        component: Stocks,
      },
    ],
  },
  {
    name: "History Logs",
    layout: "/admin",
    path: "/history-logs",
    icon: <Icon as={MdHistory} width="20px" height="20px" color="inherit" />,
    component: HistoryLogs,
    adminOnly: true,
  },
  {
    name: "Users",
    layout: "/admin",
    path: "/users",
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: Users,
  },
  {
    name: "Forms",
    layout: "/admin",
    icon: <Icon as={MdAssignment} width="20px" height="20px" color="inherit" />,
    submenu: [
      {
        name: "Shipping Instructions",
        path: "/forms/shipping-instructions",
        icon: (
          <Icon
            as={MdDirectionsBoat}
            width="20px"
            height="20px"
            color="inherit"
          />
        ),
        component: ShippingInstructions,
      },
      {
        name: "Shipping Confirmation",
        path: "/forms/shipping-confirmation",
        icon: (
          <Icon
            as={MdConfirmationNumber}
            width="20px"
            height="20px"
            color="inherit"
          />
        ),
        component: ShippingConfirmation,
      },
      {
        name: "Delivery Instructions",
        path: "/forms/delivery-instructions",
        icon: (
          <Icon
            as={MdDeliveryDining}
            width="20px"
            height="20px"
            color="inherit"
          />
        ),
        component: DeliveryInstructions,
      },
      {
        name: "Delivery Confirmation",
        path: "/forms/delivery-confirmation",
        icon: (
          <Icon
            as={MdConfirmationNumber}
            width="20px"
            height="20px"
            color="inherit"
          />
        ),
        component: DeliveryConfirmation,
      },
    ],
  },
  {
    name: "Configurations",
    layout: "/admin",
    icon: <Icon as={MdSettings} width="20px" height="20px" color="inherit" />,
    submenu: [
      {
        name: "Groups",
        path: "/configurations/groups",
        icon: <Icon as={MdGroups} width="20px" height="20px" color="inherit" />,
        component: Groups,
      },
      {
        name: "Locations",
        path: "/configurations/locations",
        icon: <Icon as={MdLocationOn} width="20px" height="20px" color="inherit" />,
        component: Locations,
      },
      {
        name: "Unit of Measurement",
        path: "/configurations/uom",
        icon: <Icon as={MdStraighten} width="20px" height="20px" color="inherit" />,
        component: UOM,
      },
      {
        name: "Currencies",
        path: "/configurations/currencies",
        icon: <Icon as={MdAttachMoney} width="20px" height="20px" color="inherit" />,
        component: Currencies,
      },
      {
        name: "Countries",
        path: "/configurations/countries",
        icon: <Icon as={MdPublic} width="20px" height="20px" color="inherit" />,
        component: Countries,
      },
      {
        name: "Vessels",
        path: "/configurations/vessels",
        icon: <Icon as={MdDirectionsBoat} width="20px" height="20px" color="inherit" />,
        component: Vessels,
        exact: true,
      },
      {
        name: "Destinations",
        path: "/configurations/destinations",
        icon: <Icon as={MdPlace} width="20px" height="20px" color="inherit" />,
        component: Destinations,
      },
      {
        name: "Suppliers",
        path: "/configurations/suppliers",
        icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
        component: Suppliers,
      },
      // {
      //   name: "Warehouses",
      //   path: "/configurations/warehouses",
      //   icon: <Icon as={MdStorage} width="20px" height="20px" color="inherit" />,
      //   component: Warehouses,
      // },
    ],
  },
  {
    name: "Sign In",
    layout: "/auth",
    path: "/sign-in",
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: SignInCentered,
    hidden: true,
  },
  {
    name: "Forgot Password",
    layout: "/auth",
    path: "/forgot-password",
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: ForgotPassword,
    hidden: true,
  },
  {
    name: "Sign Up",
    layout: "/auth",
    path: "/sign-up",
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: SignUp,
    hidden: true,
  },
];

// Hidden routes that should not appear in sidebar but are available for routing
const hiddenRoutes = [
  {
    name: "Quotation Editor",
    layout: "/admin",
    path: "/quotations/edit/:id?",
    component: QuotationEditor,
  },
  {
    name: "Quotation Detail",
    layout: "/admin",
    path: "/quotations/detail/:id",
    component: QuotationDetail,
  },
  {
    name: "Shipping Instruction Detail",
    layout: "/admin",
    path: "/forms/shipping-instruction/:id",
    component: ShippingInstructionDetail,
  },
  {
    name: "Delivery Instruction Detail",
    layout: "/admin",
    path: "/forms/delivery-instruction/:id",
    component: DeliveryInstructionDetail,
  },
  {
    name: "Client Registration",
    layout: "/admin",
    path: "/customer-registration",
    component: CustomerRegistration,
  },
  {
    name: "Vendor Registration",
    layout: "/admin",
    path: "/vendor-registration/:id?",
    component: VendorRegistration,
  },
  {
    name: "Agent Detail",
    layout: "/admin",
    path: "/contacts/agents/:id",
    component: AgentDetail,
  },
  {
    name: "Client Detail",
    layout: "/admin",
    path: "/contacts/customer/:id",
    component: ClientDetail,
  },
  {
    name: "Stock Form",
    layout: "/admin",
    path: "/stock-list/form/:id?",
    component: StockForm,
  },
  {
    name: "StockDB Main Edit",
    layout: "/admin",
    path: "/stock-list/main-db-edit",
    component: StockDBMainEdit,
  },
  {
    name: "Vessel Detail",
    layout: "/admin",
    path: "/configurations/vessels/:id",
    component: VesselDetail,
  },
];

// Filter routes based on user type (admin vs user)
export const getFilteredRoutes = (userType = "user") => {
  const isAdmin = userType === "admin";

  return routes.map(route => {
    // If route has submenu, filter submenu items
    if (route.submenu) {
      const filteredSubmenu = route.submenu.filter(item => {
        // Show all items, or if adminOnly is true, only show to admin
        return !item.adminOnly || (item.adminOnly && isAdmin);
      });

      // If all submenu items are filtered out, don't show the parent menu
      if (filteredSubmenu.length === 0) {
        return null;
      }

      return {
        ...route,
        submenu: filteredSubmenu
      };
    }

    // If route itself is admin only
    if (route.adminOnly && !isAdmin) {
      return null;
    }

    return route;
  }).filter(route => route !== null); // Remove null routes
};

export { hiddenRoutes };
export default routes;
