import React from "react";
import { Box, Flex, Heading, Icon, SimpleGrid, Text, useColorModeValue } from "@chakra-ui/react";
import { MdBuild, MdSchedule } from "react-icons/md";

const jobs = [
  { title: "Engine Inspection", eta: "Today, 17:30" },
  { title: "Cargo Verification", eta: "Tomorrow, 09:00" },
  { title: "Port Documentation", eta: "12 Apr, 11:15" },
];

function ClientJobs() {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
        Jobs
      </Heading>
      <Text mt={1} mb={5} fontSize="sm" color={muted}>
        Upcoming operational tasks and schedules.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {jobs.map((job) => (
          <Box key={job.title} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={4}>
            <Flex align="center" gap={2} color="brand.500" mb={2}>
              <Icon as={MdBuild} />
              <Text fontWeight="700" fontSize="sm">{job.title}</Text>
            </Flex>
            <Flex align="center" gap={2}>
              <Icon as={MdSchedule} color={muted} />
              <Text fontSize="sm" color={muted}>{job.eta}</Text>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default ClientJobs;
