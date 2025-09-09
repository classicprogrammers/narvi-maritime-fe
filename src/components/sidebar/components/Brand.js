import React from "react";

// Chakra imports
import { Flex, Image } from "@chakra-ui/react";

// Custom components
// import { ClassicLogo } from "components/icons/Icons";
// import { HSeparator } from "components/separator/Separator";

export function SidebarBrand(props) {
  const { collapsed = true } = props;
  //   Chakra color mode
  // let logoColor = useColorModeValue("navy.700", "white");

  return (
    <Flex align='center' direction='column'>
      {/* <ClassicLogo h='26px' w='175px' my='32px' color={logoColor} />
      <HSeparator mb='20px' /> */}
      {collapsed ?
      <Image
      src={require("assets/img/ship-logo.png")}
      alt='Logo'
      transition="all 0.2s"
    /> :
      <Image
        src={require("assets/img/Logo.png")}
        alt='Logo'
        transition="all 0.2s"
      />
}
    </Flex>
  );
}

export default SidebarBrand;
