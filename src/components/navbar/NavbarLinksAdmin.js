// Chakra Imports
import {
  Avatar,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  IconButton,
} from "@chakra-ui/react";
import { SidebarResponsive } from "components/sidebar/Sidebar";
import PropTypes from "prop-types";
import React, { useContext } from "react";
import { SidebarContext } from "contexts/SidebarContext";
import { useHistory } from "react-router-dom";
import { MdMenu, MdChevronLeft } from "react-icons/md";
import routes from "routes.js";
import { useUser } from "redux/hooks/useUser";
import { clearMasterData } from "utils/masterDataCache";

export default function HeaderLinks(props) {
  const { secondary } = props;
  const { toggleSidebar, setToggleSidebar } = useContext(SidebarContext);
  const history = useHistory();
  const { logout, user } = useUser();

  const navbarIcon = useColorModeValue("gray.400", "white");
  const menuBg = useColorModeValue("white", "navy.800");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("#E6ECFA", "rgba(135, 140, 189, 0.3)");
  const shadow = useColorModeValue(
    "14px 17px 40px 4px rgba(112, 144, 176, 0.18)",
    "14px 17px 40px 4px rgba(112, 144, 176, 0.06)"
  );

  const handleToggleSidebar = () => {
    setToggleSidebar(!toggleSidebar);
  };

  const handleLogout = () => {
    clearMasterData();
    logout();
    history.push("/auth/sign-in");
  };

  const getUserDisplayName = () => {
    if (user && user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user && user.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };
  return (
    <Flex
      w={{ sm: "100%", md: "auto" }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      flexWrap={secondary ? { base: "wrap", md: "nowrap" } : "unset"}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
    >
      <IconButton
        display={{ base: "none", xl: "flex" }}
        icon={<Icon as={toggleSidebar ? MdChevronLeft : MdMenu} />}
        variant="ghost"
        aria-label={toggleSidebar ? "Collapse sidebar" : "Expand sidebar"}
        onClick={handleToggleSidebar}
        color={navbarIcon}
        _hover={{ bg: "gray.100" }}
        me="10px"
      />
      <SidebarResponsive routes={routes} />

      <Menu>
        <MenuButton p="0px">
          <Avatar
            _hover={{ cursor: "pointer" }}
            color="white"
            name={getUserDisplayName()}
            bg="#174693"
            size="sm"
            w="40px"
            h="40px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="0px"
          mt="10px"
          borderRadius="20px"
          bg={menuBg}
          border="none"
        >
          <Flex w="100%" mb="0px">
            <Text
              ps="20px"
              pt="16px"
              pb="10px"
              w="100%"
              borderBottom="1px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="700"
              color={textColor}
            >
              👋&nbsp; Hey, {getUserDisplayName()}
            </Text>
          </Flex>
          <Flex flexDirection="column" p="10px">
            <MenuItem
              _hover={{ bg: "none" }}
              _focus={{ bg: "none" }}
              color="red.400"
              borderRadius="8px"
              px="14px"
              onClick={handleLogout}
            >
              <Text fontSize="sm">Log out</Text>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
