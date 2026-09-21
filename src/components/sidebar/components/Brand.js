import React from "react";
import { Flex, Image } from "@chakra-ui/react";

export function SidebarBrand(props) {
  const { collapsed = true } = props;

  return (
    <Flex align="center" direction="column">
      {collapsed ? (
        <Image
          src={require("assets/img/ship-logo.png")}
          alt="Logo"
          transition="all 0.2s"
          style={{ maxWidth: "80px", maxHeight: "80px" }}
        />
      ) : (
        <Image
          src={require("assets/img/Logo.png")}
          alt="Logo"
          transition="all 0.2s"
          style={{ maxHeight: "90px" }}
        />
      )}
    </Flex>
  );
}

export default SidebarBrand;
