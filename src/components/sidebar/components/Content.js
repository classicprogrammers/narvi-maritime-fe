// chakra imports
import { Box, Flex, Stack } from "@chakra-ui/react";
//   Custom components
import Brand from "components/sidebar/components/Brand";
import Links from "components/sidebar/components/Links";
// import SidebarCard from "components/sidebar/components/SidebarCard";
import React from "react";

// FUNCTIONS

function SidebarContent(props) {
  const { routes, collapsed = false } = props;
  // SIDEBAR
  return (
    <Flex direction='column' height='100%' pt='25px' px={collapsed ? "8px" : "16px"} borderRadius='30px'>
      <Brand collapsed={collapsed} />
      <Stack direction='column' mb='auto' mt='8px'>
        <Box ps={collapsed ? "0px" : '20px'} pe={{ md: collapsed ? "0px" : "16px", "2xl": collapsed ? "0px" : "1px" }}>
          <Links routes={routes} collapsed={collapsed} />
        </Box>
      </Stack>

      {/* <Box
        mt='60px'
        mb='40px'
        borderRadius='30px'>
        <SidebarCard />
      </Box> */}
    </Flex>
  );
}

export default SidebarContent;
