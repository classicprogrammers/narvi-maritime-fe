import React from "react";
import ShippingInstructionDetail from "./ShippingInstructionDetail";

export default function ShippingInstructions() {
  // Show the Shipping Instruction detail layout directly on the main route.
  // The detail component currently uses sample data and does not depend on an :id param,
  // so we can safely reuse it here as the default view without any table/list UI.
  return <ShippingInstructionDetail />;
}
