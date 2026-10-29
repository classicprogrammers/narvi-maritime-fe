// List columns (same order as the forms) and table-view entry columns.
// key: record field shown. sortKey: backend sort_by value (omit = not sortable).
// type: text | longtext | number | date | badge | roe | due | bool | link | invoiceLink
// covers: form state keys this column represents (used by the parity test).

export const COST_COLUMNS = [
  { key: "so_number", label: "SO Number", sortKey: "so_number", type: "text", minW: "120px", covers: ["sale_order_id"] },
  { key: "so_create_date", label: "SO Create Date", sortKey: "so_create_date", type: "date", minW: "120px" },
  { key: "so_done_status", label: "SO Status", sortKey: "so_done_status", type: "badge", minW: "130px", covers: ["so_status", "so_status_label", "so_done_status_label"] },
  { key: "client_case_invoice_ref", label: "Client Case / Invoice Ref", type: "longtext", minW: "170px" },
  { key: "agent", label: "Agent", sortKey: "agent", type: "text", minW: "160px", covers: ["agent_id", "agent_detail"] },
  { key: "client", label: "Client", sortKey: "client", type: "text", minW: "160px" },
  { key: "vessel_name", label: "Vessel", sortKey: "vessel_name", type: "text", minW: "140px" },
  { key: "destination", label: "Destination", sortKey: "destination", type: "text", minW: "160px", covers: ["destination_type", "destination_type_label", "destination_name", "destination_country"] },
  { key: "biz_category", label: "Biz Category", sortKey: "biz_category", type: "text", minW: "120px" },
  { key: "currency_code", label: "Currency", sortKey: "currency_code", type: "text", minW: "90px", covers: ["currency_id"] },
  { key: "currency_amount", label: "Amount", sortKey: "currency_amount", type: "number", minW: "120px" },
  { key: "roe_invoice_date", label: "ROE", sortKey: "roe_invoice_date", type: "roe", minW: "110px", covers: ["roe_manual", "roe_date"] },
  { key: "usd_cost", label: "USD Cost", sortKey: "usd_cost", type: "number", minW: "110px" },
  { key: "gst_input_tax", label: "GST Input Tax %", type: "number", minW: "110px" },
  { key: "gst_in_amount", label: "GST In Amount", type: "number", minW: "110px" },
  { key: "invoices", label: "Invoices", sortKey: "invoices", type: "longtext", minW: "160px" },
  { key: "date_agent_invoice", label: "Invoice Date", sortKey: "date_agent_invoice", type: "date", minW: "110px" },
  { key: "date_due_agent", label: "Due", sortKey: "date_due_agent", type: "due", minW: "110px", covers: ["date_due_manual"] },
  { key: "date_agent_paid", label: "Paid", sortKey: "date_agent_paid", type: "date", minW: "110px" },
  { key: "invoice_link", label: "Invoice Link", type: "invoiceLink", minW: "90px" },
];

export const INVOICE_COLUMNS = [
  { key: "so_number", label: "SO Number", sortKey: "so_number", type: "text", minW: "120px", covers: ["sale_order_id"] },
  { key: "so_create_date", label: "SO Date Created", sortKey: "so_create_date", type: "date", minW: "120px" },
  { key: "so_done_status", label: "SO Status", sortKey: "so_done_status", type: "badge", minW: "130px", covers: ["so_status", "so_status_label", "so_done_status_label"] },
  { key: "client_case_invoice_ref", label: "Client Case / Invoice Ref", type: "longtext", minW: "170px" },
  { key: "client", label: "Client", sortKey: "client", type: "text", minW: "160px", covers: ["client_id"] },
  { key: "vessel_name", label: "Vessel", sortKey: "vessel_name", type: "text", minW: "140px" },
  { key: "destination", label: "Destination", sortKey: "destination", type: "text", minW: "160px", covers: ["destination_type", "destination_type_label", "destination_name", "destination_country"] },
  { key: "biz_category", label: "Biz Category", sortKey: "biz_category", type: "text", minW: "120px", covers: ["biz_category_label"] },
  { key: "invoice_number", label: "Invoice Number", sortKey: "invoice_number", type: "text", minW: "130px" },
  { key: "currency_code", label: "Currency", sortKey: "currency_code", type: "text", minW: "90px", covers: ["currency_id"] },
  { key: "currency_amount", label: "Amount", sortKey: "currency_amount", type: "number", minW: "120px" },
  { key: "roe", label: "ROE", sortKey: "roe", type: "roe", minW: "110px", covers: ["roe_manual", "roe_date"] },
  { key: "usd_amount", label: "USD Amount", sortKey: "usd_amount", type: "number", minW: "110px" },
  { key: "date_sales_invoice", label: "Invoice Date", sortKey: "date_sales_invoice", type: "date", minW: "110px" },
  { key: "date_due", label: "Due", sortKey: "date_due", type: "due", minW: "110px", covers: ["date_due_manual"] },
  { key: "date_paid", label: "Paid", sortKey: "date_paid", type: "date", minW: "110px" },
  { key: "client_amount_paid", label: "Client Amount Paid", sortKey: "client_amount_paid", type: "number", minW: "130px" },
  { key: "invoice_balance", label: "Invoice Balance", sortKey: "invoice_balance", type: "number", minW: "120px" },
  { key: "invoice_balance_usd", label: "Invoice Balance USD", type: "number", minW: "130px" },
  { key: "bank_change_usd", label: "Bank Change USD", type: "number", minW: "120px" },
  { key: "payment_status", label: "Payment Status", sortKey: "payment_status", type: "badge", minW: "110px", covers: ["payment_status_label"] },
  { key: "gst_output_tax", label: "GST Output Tax", type: "text", minW: "110px" },
  { key: "gst_out_amount", label: "GST Out Amount", type: "number", minW: "120px" },
  { key: "invoice_soa", label: "Invoice SOA", type: "bool", minW: "100px" },
  { key: "customer_billing_remarks", label: "Customer Billing Remarks", type: "longtext", minW: "180px" },
  { key: "payment_remark", label: "Payment Remark", type: "longtext", minW: "160px" },
  { key: "so_remark", label: "SO Remark", type: "longtext", minW: "160px" },
];

// Table-view entry columns = writable fields, in form order.
// type: so | agent | currency | number | roe | date | due | textarea | select | text | gst | bool
// derived: muted read-only columns filled after pick or save
export const COST_TABLE_ENTRY_COLUMNS = [
  { key: "sale_order_id", label: "SO Number", type: "so", minW: "200px", required: true },
  { key: "so_done_status", label: "SO Status", derived: true, minW: "120px" },
  { key: "client_case_invoice_ref", label: "Client Case / Invoice Ref", derived: true, minW: "160px" },
  { key: "agent_id", label: "Agent", type: "agent", minW: "200px", required: true },
  { key: "biz_category", label: "Biz Category", type: "select", minW: "130px" },
  { key: "currency_id", label: "Currency", type: "currency", minW: "110px" },
  { key: "currency_amount", label: "Amount", type: "number", minW: "120px", required: true },
  { key: "roe_invoice_date", label: "ROE", type: "roe", minW: "130px" },
  { key: "gst_input_tax", label: "GST Input Tax %", type: "number", minW: "110px" },
  { key: "invoices", label: "Invoices", type: "textarea", minW: "180px" },
  { key: "date_agent_invoice", label: "Invoice Date", type: "date", minW: "140px" },
  { key: "date_due_agent", label: "Due", type: "due", minW: "140px" },
  { key: "date_agent_paid", label: "Paid", type: "date", minW: "140px" },
  { key: "invoice_link", label: "Invoice Link", type: "text", minW: "160px" },
];

export const INVOICE_TABLE_ENTRY_COLUMNS = [
  { key: "sale_order_id", label: "SO Number", type: "so", minW: "200px", required: true },
  { key: "so_done_status", label: "SO Status", derived: true, minW: "120px" },
  { key: "client_case_invoice_ref", label: "Client Case / Invoice Ref", derived: true, minW: "160px" },
  { key: "invoice_number", label: "Invoice Number", type: "text", minW: "140px" },
  { key: "date_sales_invoice", label: "Invoice Date", type: "date", minW: "140px" },
  { key: "currency_id", label: "Currency", type: "currency", minW: "110px" },
  { key: "currency_amount", label: "Amount", type: "number", minW: "120px", required: true },
  { key: "roe", label: "ROE", type: "roe", minW: "130px" },
  { key: "date_due", label: "Due", type: "due", minW: "140px" },
  { key: "date_paid", label: "Paid", type: "date", minW: "140px" },
  { key: "client_amount_paid", label: "Client Amount Paid", type: "number", minW: "130px" },
  { key: "bank_change_usd", label: "Bank Change USD", type: "number", minW: "120px" },
  { key: "gst_output_tax", label: "GST Output Tax", type: "gst", minW: "130px" },
  { key: "gst_out_amount", label: "GST Out Amount", type: "number", minW: "120px" },
  { key: "invoice_soa", label: "Invoice SOA", type: "bool", minW: "100px" },
  { key: "customer_billing_remarks", label: "Customer Billing Remarks", type: "textarea", minW: "180px" },
  { key: "payment_remark", label: "Payment Remark", type: "textarea", minW: "160px" },
  { key: "so_remark", label: "SO Remark", type: "textarea", minW: "160px" },
];
