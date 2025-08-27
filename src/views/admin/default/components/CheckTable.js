import {
  Flex,
  Table,
  Checkbox,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import React, { useMemo, useCallback } from "react";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";
import { MdShoppingCart } from "react-icons/md";

// Custom components
import Card from "components/card/Card";
import Menu from "components/menu/MainMenu";
import IconBox from "components/icons/IconBox";

// Import data directly to avoid lazy loading issues
import { columnsDataCheck } from "../variables/columnsData";
import tableDataCheck from "../variables/tableDataCheck.json";

const CheckTable = function CheckTable(props) {
  const { columnsData = columnsDataCheck, tableData = tableDataCheck } = props;

  // Memoize columns and data to prevent unnecessary re-renders
  const columns = useMemo(() => columnsData, [columnsData]);
  const data = useMemo(() => tableData, [tableData]);

  // Move useTable to top level - hooks must be called at component level
  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 11 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
  } = tableInstance;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const brandColor = useColorModeValue("#174693", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  // Memoize cell render functions
  const renderCell = useCallback((cell, textColor) => {
    if (cell.column.Header === "NAME") {
      return (
        <Flex align="center">
          <Checkbox
            defaultChecked={cell.value[1]}
            colorScheme="brandScheme"
            me="10px"
          />
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {cell.value[0]}
          </Text>
        </Flex>
      );
    } else if (cell.column.Header === "PROGRESS") {
      return (
        <Flex align="center">
          <Text
            me="10px"
            color={textColor}
            fontSize="sm"
            fontWeight="700"
          >
            {cell.value}%
          </Text>
        </Flex>
      );
    } else if (cell.column.Header === "QUANTITY") {
      return (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {cell.value}
        </Text>
      );
    } else if (cell.column.Header === "DATE") {
      return (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {cell.value}
        </Text>
      );
    }
    return null;
  }, []);

  // Memoize header rendering
  const renderHeader = useCallback((headerGroup, borderColor) => (
    <Tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
      {headerGroup.headers.map((column, index) => (
        <Th
          {...column.getHeaderProps(column.getSortByToggleProps())}
          pe="10px"
          key={column.id || index}
          borderColor={borderColor}
        >
          <Flex
            justify="space-between"
            align="center"
            fontSize={{ sm: "10px", lg: "12px" }}
            color="gray.400"
          >
            {column.render("Header")}
          </Flex>
        </Th>
      ))}
    </Tr>
  ), []);

  // Memoize row rendering
  const renderRow = useCallback((row, textColor) => {
    prepareRow(row);
    return (
      <Tr {...row.getRowProps()} key={row.id}>
        {row.cells.map((cell, index) => (
          <Td
            {...cell.getCellProps()}
            key={cell.column.id || index}
            fontSize={{ sm: "14px" }}
            minW={{ sm: "150px", md: "200px", lg: "auto" }}
            borderColor="transparent"
          >
            {renderCell(cell, textColor)}
          </Td>
        ))}
      </Tr>
    );
  }, [prepareRow, renderCell]);

  return (
    <Card
      direction="column"
      w="100%"
      px="0px"
      overflowX={{ sm: "scroll", lg: "hidden" }}
    >
      <Flex px="25px" justify="space-between" align="center">
        <Flex align="center" gap="10px">
          <IconBox
            w="56px"
            h="56px"
            bg={boxBg}
            icon={
              <Icon w="32px" h="32px" as={MdShoppingCart} color={brandColor} />
            }
          />
          <Text
            color={textColor}
            fontSize="22px"
            fontWeight="700"
            lineHeight="100%"
          >
            New Orders
          </Text>
        </Flex>
        <Menu />
      </Flex>
      <Table {...getTableProps()} variant="simple" color="gray.500" mb="24px">
        <Thead>
          {headerGroups.map((headerGroup) => renderHeader(headerGroup, borderColor))}
        </Thead>
        <Tbody {...getTableBodyProps()}>
          {page.map((row) => renderRow(row, textColor))}
        </Tbody>
      </Table>
    </Card>
  );
}

export default CheckTable;
