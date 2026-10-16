import React from "react";
import Stocks from "./Stocks";

/**
 * StockDB Main — same page as Stocklist View/Edit (columns, keys, filters, column filters,
 * sorting), with its own persisted filter state and "main-db" as the edit return page.
 */
export default function StockList() {
    return <Stocks variant="main-db" />;
}
