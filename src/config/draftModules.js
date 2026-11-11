import { createStockItemApi, updateStockItemApi } from "api/stock";
import { createShippingOrder, updateShippingOrder } from "api/shippingOrders";
import { createRateListApi, updateRateListApi } from "api/rate";
import { createChargeCategoryApi, updateChargeCategoryApi } from "api/chargeCategory";
import { createQuotationFromSelection, updateNarviQuotation } from "api/narviQuotation";
import { bulkUpdateLedgerCosts } from "api/ledgerCost";
import { bulkUpdateLedgerInvoices } from "api/ledgerInvoice";
import { updateFormOptionApi } from "api/formOptions";
import { registerCustomerApi, updateCustomerApi } from "api/customer";
import { registerVendorApi, updateVendorApi } from "api/vendor";
import { bulkCreateVessels, bulkUpdateVesselItems } from "api/vessels";
import groupsAPI from "api/groups";
import picAPI from "api/pic";
import uomAPI from "api/uom";
import countriesAPI from "api/countries";
import currenciesAPI from "api/currencies";
import stockListLocationsAPI from "api/stockListLocations";
import stockListDestinationsAPI from "api/stockListDestinations";
import { createSupplier, updateSupplier } from "api/suppliers";
import { signupUserApi, updateUserApi } from "api/users";
import { createClientLoginApi, updateClientLoginApi } from "api/clientLogin";
import {
  updateEmissionFactorsApi,
  upsertLocationDistanceApi,
  setStockManualDistanceApi,
} from "api/carbon";
import { isExplicitFailure } from "utils/draftFailure";
import { isLedgerBulkPartialFailure } from "utils/ledgerBulkDraft";
import { isRateSaveFailure } from "utils/rateDraft";
import { isStockSaveFailure } from "utils/stockDraft";
import { getMsoApiError } from "utils/shippingOrderMso";

const explicitFailure = (apiName, result) => isExplicitFailure(result);
// Bulk ledger edits also fail when the backend skips some requested ids (same check as the screens).
const ledgerBulkFailure = (apiName, result, args) =>
  isExplicitFailure(result) || isLedgerBulkPartialFailure(args?.[0], result);
// Same checks the screens pass to saveWithDraft, so Drafts-page Retry judges results the same way.
const stockFailure = (apiName, result) => isStockSaveFailure(result);
const rateFailure = (apiName, result) => isRateSaveFailure(result);
const msoFailure = (apiName, result) => Boolean(getMsoApiError(result));
const customerFailure = (apiName, result) => result?.result?.status !== "success";
// mirrors isSuccessResponse in vendor-registration
const vendorFailure = (apiName, result) =>
  !(
    result &&
    (result.result?.status === "success" || result.status === "success" || result.success === true)
  );

const SUCCESS_STATUSES = ["success", "ok"];

/**
 * Generic failure check (spec CP1 decision 6). Thrown errors are handled by the caller.
 * A missing result (null/undefined) and non-object results are not treated as failures.
 */
export function defaultIsFailure(result) {
  if (result == null || typeof result !== "object") return false;
  const inner = result.result && typeof result.result === "object" ? result.result : null;
  if (result.status === "error" || inner?.status === "error") return true;
  if (Array.isArray(result.errors) && result.errors.length > 0) return true;
  if (Array.isArray(inner?.errors) && inner.errors.length > 0) return true;
  const status = result.status ?? inner?.status;
  if (SUCCESS_STATUSES.includes(status)) return false;
  if (result.success === true || inner?.success === true) return false;
  return true;
}

const draftState = (draft) => ({ draftId: draft.id });
const page = (pathname) => (draft) => ({ pathname, state: draftState(draft) });
const byRecord = (base, fallbackPath) => (draft) => ({
  pathname:
    draft.recordId != null && draft.mode === "update" ? `${base}/${draft.recordId}` : fallbackPath,
  state: draftState(draft),
});

export const DRAFT_MODULES = {
  stock: {
    isFailure: stockFailure,
    label: "Stock items",
    category: "A",
    resumeTo: (draft) => ({
      pathname: "/admin/stock-list/stock",
      state: { ...(draft.formState?.routeState || {}), draftId: draft.id },
    }),
    apis: { createStockItemApi, updateStockItemApi },
  },
  stockLegacyForm: {
    isFailure: stockFailure,
    label: "Stock form",
    category: "A",
    resumeTo: byRecord("/admin/stock-list/form", "/admin/stock-list/form"),
    apis: { createStockItemApi, updateStockItemApi },
  },
  stockInline: {
    isFailure: stockFailure,
    label: "Stock (inline edit)",
    category: "D",
    apis: { updateStockItemApi },
  },
  shippingOrder: {
    isFailure: msoFailure,
    label: "Shipping order",
    category: "A",
    resumeTo: (draft) => {
      const target = byRecord("/admin/shipping-orders/edit", "/admin/shipping-orders/create")(draft);
      // MSO create is /create?is_mso=1; the flag is stored in formState.isMso
      return draft.mode !== "update" && draft.formState?.isMso
        ? { ...target, search: "?is_mso=1" }
        : target;
    },
    apis: { createShippingOrder, updateShippingOrder },
  },
  shippingOrderRemark: {
    isFailure: msoFailure,
    label: "Shipping order remark",
    category: "D",
    apis: { updateShippingOrder },
  },
  rate: {
    isFailure: rateFailure,
    label: "Rate list",
    category: "A",
    resumeTo: (draft) => ({
      pathname: "/admin/quotations/rate-list/rate",
      state: { ...(draft.formState?.routeState || {}), draftId: draft.id },
    }),
    apis: { createRateListApi, updateRateListApi },
  },
  rateCopy: {
    isFailure: rateFailure,
    label: "Rate copy",
    category: "D",
    apis: { createRateListApi },
  },
  quotationDetail: {
    isFailure: explicitFailure,
    label: "Quotation",
    category: "D",
    apis: { updateNarviQuotation },
  },
  quotationWizard: {
    isFailure: explicitFailure,
    label: "Quotation wizard",
    category: "D",
    apis: { createQuotationFromSelection },
  },
  chargeCategory: {
    isFailure: explicitFailure,
    label: "Charge category",
    category: "C",
    resumeTo: page("/admin/quotations/charge-categories"),
    apis: { createChargeCategoryApi, updateChargeCategoryApi },
  },
  ledgerCostBulk: {
    isFailure: ledgerBulkFailure,
    label: "Ledger cost (bulk edit)",
    category: "D",
    apis: { bulkUpdateLedgerCosts },
  },
  ledgerInvoiceBulk: {
    isFailure: ledgerBulkFailure,
    label: "Ledger invoice (bulk edit)",
    category: "D",
    apis: { bulkUpdateLedgerInvoices },
  },
  formOption: {
    isFailure: explicitFailure,
    label: "Form option",
    category: "D",
    apis: { updateFormOptionApi },
  },
  customer: {
    isFailure: customerFailure,
    label: "Customer",
    category: "A",
    resumeTo: (draft) => ({
      pathname: "/admin/customer-registration",
      state: {
        ...(draft.mode === "update" && draft.recordId != null ? { clientId: draft.recordId } : {}),
        draftId: draft.id,
      },
    }),
    apis: { registerCustomerApi, updateCustomerApi },
  },
  customerInline: {
    isFailure: customerFailure,
    label: "Customer (inline edit)",
    category: "D",
    apis: { updateCustomerApi },
  },
  vendor: {
    isFailure: vendorFailure,
    label: "Vendor",
    category: "A",
    resumeTo: (draft) => {
      const target = byRecord("/admin/vendor-registration", "/admin/vendor-registration")(draft);
      // the form loads an existing agent from route state (no fetch by id), so hand the stored record back
      return draft.mode === "update" && draft.formState?.vendorData
        ? { ...target, state: { ...target.state, vendorData: draft.formState.vendorData } }
        : target;
    },
    apis: { registerVendorApi, updateVendorApi },
  },
  vessel: {
    label: "Vessel",
    category: "A",
    resumeTo: (draft) => {
      if (draft.mode === "update" && Array.isArray(draft.recordId) && draft.recordId.length > 0) {
        return {
          pathname: "/admin/configurations/vessels/bulk-edit",
          search: `?ids=${draft.recordId.join(",")}`,
          state: draftState(draft),
        };
      }
      return draft.mode === "update" && draft.recordId != null && !Array.isArray(draft.recordId)
        ? { pathname: `/admin/configurations/vessels/edit/${draft.recordId}`, state: draftState(draft) }
        : { pathname: "/admin/configurations/vessels/create", state: draftState(draft) };
    },
    apis: { bulkCreateVessels, bulkUpdateVesselItems },
    // bulk vessel calls report failure as result.result.status === "error"
    isFailure: (apiName, result) => {
      const inner = result?.result;
      const data = inner?.result && typeof inner.result === "object" ? inner.result : inner || {};
      return data.status === "error";
    },
  },
  group: {
    isFailure: explicitFailure,
    label: "Group",
    category: "C",
    resumeTo: page("/admin/configurations/groups"),
    apis: { createGroup: groupsAPI.createGroup, updateGroup: groupsAPI.updateGroup },
  },
  pic: {
    isFailure: explicitFailure,
    label: "PIC",
    category: "C",
    resumeTo: page("/admin/configurations/pic"),
    apis: { createPIC: picAPI.createPIC, updatePIC: picAPI.updatePIC },
  },
  uom: {
    isFailure: explicitFailure,
    label: "Unit of measure",
    category: "C",
    resumeTo: page("/admin/configurations/uom"),
    apis: { createUOM: uomAPI.createUOM, updateUOM: uomAPI.updateUOM },
  },
  uomCategory: {
    isFailure: explicitFailure,
    label: "UoM category",
    category: "C",
    resumeTo: page("/admin/configurations/uom"),
    apis: {
      createUOMCategory: uomAPI.createUOMCategory,
      updateUOMCategory: uomAPI.updateUOMCategory,
    },
  },
  country: {
    isFailure: explicitFailure,
    label: "Country",
    category: "C",
    resumeTo: page("/admin/configurations/countries"),
    apis: { createCountry: countriesAPI.createCountry, updateCountry: countriesAPI.updateCountry },
  },
  currency: {
    isFailure: explicitFailure,
    label: "Currency",
    category: "C",
    resumeTo: page("/admin/configurations/currencies"),
    apis: {
      createCurrency: currenciesAPI.createCurrency,
      updateCurrency: currenciesAPI.updateCurrency,
    },
  },
  stockLocation: {
    isFailure: explicitFailure,
    label: "Stock location",
    category: "C",
    resumeTo: page("/admin/configurations/locations"),
    apis: {
      createLocation: stockListLocationsAPI.createLocation,
      updateLocation: stockListLocationsAPI.updateLocation,
    },
  },
  stockDestination: {
    isFailure: explicitFailure,
    label: "Stock destination",
    category: "C",
    resumeTo: page("/admin/configurations/destinations"),
    apis: {
      createDestination: stockListDestinationsAPI.createDestination,
      updateDestination: stockListDestinationsAPI.updateDestination,
    },
  },
  supplier: {
    isFailure: explicitFailure,
    label: "Supplier",
    category: "C",
    resumeTo: page("/admin/configurations/suppliers"),
    apis: { createSupplier, updateSupplier },
  },
  user: {
    isFailure: explicitFailure,
    label: "User",
    category: "C",
    resumeTo: page("/admin/users"),
    requiresSecrets: true,
    apis: { signupUserApi, updateUserApi },
  },
  clientLogin: {
    isFailure: explicitFailure,
    label: "Client login",
    category: "C",
    resumeTo: page("/admin/users"),
    requiresSecrets: true,
    apis: { createClientLoginApi, updateClientLoginApi },
  },
  carbonFactors: {
    isFailure: explicitFailure,
    label: "Emission factors",
    category: "D",
    apis: { updateEmissionFactorsApi },
  },
  carbonDistance: {
    isFailure: explicitFailure,
    label: "Carbon distance",
    category: "D",
    apis: { upsertLocationDistanceApi, setStockManualDistanceApi },
  },
};

export default DRAFT_MODULES;
