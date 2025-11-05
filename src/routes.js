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

// Stock List Import
import StockList from "views/admin/stock-list";

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
import UOM from "views/admin/configurations/uom";
import Destinations from "views/admin/configurations/destinations";

// Auth Imports
import SignInCentered from "views/auth/signIn";
import ForgotPassword from "views/auth/forgotPassword";
import SignUp from "views/auth/signUp";

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
    path: "/stock-list",
    component: StockList,
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
      },
      {
        name: "Destinations",
        path: "/configurations/destinations",
        icon: <Icon as={MdPlace} width="20px" height="20px" color="inherit" />,
        component: Destinations,
      },
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
];

export { hiddenRoutes };
export default routes;
