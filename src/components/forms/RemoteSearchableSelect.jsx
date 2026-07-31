import React from "react";
import SimpleSearchableSelect from "./SimpleSearchableSelect";

/**
 * Props matching Shipping Instruction searchable selects:
 * client-side filter of loaded options + onSearchChange reloads options from API.
 * Do not enable serverSideSearch — that mode auto-closes on empty interim results.
 */
export const REMOTE_SEARCHABLE_SELECT_PROPS = {
  prefillOnFocus: false,
};

/**
 * Shared searchable select for remote/paginated option lists (stock, SI-style forms).
 * Same behavior as Shipping Instruction Agent/Consignee selects.
 */
export default function RemoteSearchableSelect(props) {
  return <SimpleSearchableSelect {...REMOTE_SEARCHABLE_SELECT_PROPS} {...props} />;
}
