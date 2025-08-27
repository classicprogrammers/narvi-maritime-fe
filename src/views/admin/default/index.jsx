// Chakra imports
import {
  Box,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";

// Custom components
import MiniCalendar from "components/calendar/MiniCalendar";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useMemo, useCallback } from "react";
import {
  MdAddTask,
  MdAttachMoney,
  MdBarChart,
  MdPeople,
  MdLocalShipping,
  MdSummarize,
} from "react-icons/md";

// Import components directly to avoid lazy loading issues
import CheckTable from "./components/CheckTable";
import ComplexTable from "./components/ComplexTable";
import DailyTraffic from "./components/DailyTraffic";
import PieCard from "./components/PieCard";
import Tasks from "./components/Tasks";
import TotalSpent from "./components/TotalSpent";
import WeeklyRevenue from "./components/WeeklyRevenue";

export default function UserReports() {
  // Chakra Color Mode
  const brandColor = useColorModeValue("#174693", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  // Memoize statistics data to prevent unnecessary re-renders
  const statisticsData = useMemo(() => [
    {
      icon: MdPeople,
      name: 'Clients',
      value: '350',
      bg: boxBg,
      iconColor: brandColor,
    },
    {
      icon: MdAttachMoney,
      name: 'Revenue',
      value: '$642.39',
      bg: boxBg,
      iconColor: brandColor,
    },
    {
      icon: MdBarChart,
      name: 'Sales',
      value: '$574.34',
      bg: boxBg,
      iconColor: brandColor,
    },
    {
      icon: MdLocalShipping,
      name: 'Orders',
      value: '1,000',
      bg: boxBg,
      iconColor: brandColor,
    },
    {
      icon: MdAddTask,
      name: 'Vendors',
      value: '154',
      bg: 'linear-gradient(90deg, #4481EB 0%, #04BEFE 100%)',
      iconColor: 'white',
    },
    {
      icon: MdSummarize,
      name: 'Reports',
      value: '2935',
      bg: boxBg,
      iconColor: brandColor,
    },
  ], [brandColor, boxBg]);

  // Memoize the statistics rendering function
  const renderStatistics = useCallback(() => (
    <SimpleGrid
      columns={{ base: 1, md: 2, lg: 3, "2xl": 6 }}
      gap='20px'
      mb='20px'>
      {statisticsData.map((stat, index) => (
        <MiniStatistics
          key={index}
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={stat.bg}
              icon={
                <Icon w='32px' h='32px' as={stat.icon} color={stat.iconColor} />
              }
            />
          }
          name={stat.name}
          value={stat.value}
        />
      ))}
    </SimpleGrid>
  ), [statisticsData]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Statistics Section - Memoized */}
      {renderStatistics()}

      {/* Charts Section */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap='20px' mb='20px'>
        <TotalSpent />
        <WeeklyRevenue />
      </SimpleGrid>

      {/* Tables and Charts Section */}
      <SimpleGrid columns={{ base: 1, md: 1, xl: 2 }} gap='20px' mb='20px'>
        <CheckTable />
        <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap='20px'>
          <DailyTraffic />
          <PieCard />
        </SimpleGrid>
      </SimpleGrid>

      {/* Complex Table and Calendar Section */}
      <SimpleGrid columns={{ base: 1, md: 1, xl: 2 }} gap='20px' mb='20px'>
        <ComplexTable />
        <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap='20px'>
          <Tasks />
          <MiniCalendar h='100%' minW='100%' selectRange={false} />
        </SimpleGrid>
      </SimpleGrid>
    </Box>
  );
}
