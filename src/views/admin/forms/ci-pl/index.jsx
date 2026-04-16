import React from "react";
import CiPlDetail from "./CiPlDetail";

export default function CiPl() {
  // CI PL starts as a dedicated copy of the Shipping Instructions form
  // so future changes can diverge without affecting the original screen.
  return <CiPlDetail />;
}
