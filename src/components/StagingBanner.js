import React from "react";
import { Box, Text } from "@chakra-ui/react";

export const isStagingEnvironment =
  String(process.env.REACT_APP_APP_ENV || "").trim().toLowerCase() === "staging";

export const STAGING_BANNER_HEIGHT = "25px";

export default function StagingBanner() {
  if (!isStagingEnvironment) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={2000}
      h={STAGING_BANNER_HEIGHT}
      bg="#B45309"
      color="white"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Text fontSize={{ base: "xs", sm: "sm" }} fontWeight="700" letterSpacing="0.04em" noOfLines={1}>
        This is the staging environment.
      </Text>
    </Box>
  );
}
