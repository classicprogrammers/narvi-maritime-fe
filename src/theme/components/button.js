import { mode } from "@chakra-ui/theme-tools";
export const buttonStyles = {
  components: {
    Button: {
      baseStyle: {
        borderRadius: "16px",
        boxShadow: "45px 76px 113px 7px rgba(112, 144, 176, 0.08)",
        transition: ".25s all ease",
        boxSizing: "border-box",
        _focus: {
          boxShadow: "none",
        },
        _active: {
          boxShadow: "none",
        },
      },
      variants: {
        outline: () => ({
          borderRadius: "16px",
        }),
        brand: (props) => ({
          bg: mode("#174693", "#174693")(props),
          color: "white",
          _focus: {
            bg: mode("#174693", "#174693")(props),
          },
          _active: {
            bg: mode("#174693", "#174693")(props),
          },
          _hover: {
            bg: mode("brand.600", "#174693")(props),
          },
        }),
        darkBrand: (props) => ({
          bg: mode("#174693", "#174693")(props),
          color: "white",
          _focus: {
            bg: mode("#174693", "#174693")(props),
          },
          _active: {
            bg: mode("#174693", "#174693")(props),
          },
          _hover: {
            bg: mode("brand.800", "#174693")(props),
          },
        }),
        lightBrand: (props) => ({
          bg: mode("#F2EFFF", "whiteAlpha.100")(props),
          color: mode("#174693", "white")(props),
          _focus: {
            bg: mode("#F2EFFF", "whiteAlpha.100")(props),
          },
          _active: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _hover: {
            bg: mode("secondaryGray.400", "whiteAlpha.200")(props),
          },
        }),
        light: (props) => ({
          bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          color: mode("secondaryGray.900", "white")(props),
          _focus: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _active: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _hover: {
            bg: mode("secondaryGray.400", "whiteAlpha.200")(props),
          },
        }),
        action: (props) => ({
          fontWeight: "500",
          borderRadius: "50px",
          bg: mode("secondaryGray.300", "#174693")(props),
          color: mode("#174693", "white")(props),
          _focus: {
            bg: mode("secondaryGray.300", "#174693")(props),
          },
          _active: { bg: mode("secondaryGray.300", "#174693")(props) },
          _hover: {
            bg: mode("secondaryGray.200", "#174693")(props),
          },
        }),
        setup: (props) => ({
          fontWeight: "500",
          borderRadius: "50px",
          bg: mode("transparent", "#174693")(props),
          border: mode("1px solid", "0px solid")(props),
          borderColor: mode("secondaryGray.400", "transparent")(props),
          color: mode("secondaryGray.900", "white")(props),
          _focus: {
            bg: mode("transparent", "#174693")(props),
          },
          _active: { bg: mode("transparent", "#174693")(props) },
          _hover: {
            bg: mode("secondaryGray.100", "#174693")(props),
          },
        }),
      },
    },
  },
};
