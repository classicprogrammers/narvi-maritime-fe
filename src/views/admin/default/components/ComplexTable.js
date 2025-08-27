import {
  Flex,
  Table,
  Progress,
  Icon,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useMemo, useCallback } from "react";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";

// Custom components
import Card from "components/card/Card";
import Menu from "components/menu/MainMenu";

// Assets
import { MdCheckCircle, MdCancel, MdOutlineError } from "react-icons/md";

// Import data directly to avoid lazy loading issues
import { columnsDataComplex } from "../variables/columnsData";
import tableDataComplex from "../variables/tableDataComplex.json";

const ComplexTable = function ComplexTable(props) {
  const { columnsData = columnsDataComplex, tableData = tableDataComplex } = props;

  // Memoize columns and data to prevent unnecessary re-renders
  const columns = useMemo(() => columnsData, [columnsData]);
  const data = useMemo(() => tableData, [tableData]);

  // Move useTable to top level - hooks must be called at component level
  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 5 },
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

  // Memoize cell render functions
  const renderCell = useCallback((cell, textColor) => {
    if (cell.column.Header === "NAME") {
      return (
        <Text color={textColor} fontSize='sm' fontWeight='700'>
          {cell.value}
        </Text>
      );
    } else if (cell.column.Header === "STATUS") {
      return (
        <Flex align='center'>
          <Icon
            w='24px'
            h='24px'
            me='5px'
            color={
              cell.value === "Approved"
                ? "green.500"
                : cell.value === "Disable"
                ? "red.500"
                : cell.value === "Error"
                ? "orange.500"
                : null
            }
            as={
              cell.value === "Approved"
                ? MdCheckCircle
                : cell.value === "Disable"
                ? MdCancel
                : cell.value === "Error"
                ? MdOutlineError
                : null
            }
          />
          <Text color={textColor} fontSize='sm' fontWeight='700'>
            {cell.value}
          </Text>
        </Flex>
      );
    } else if (cell.column.Header === "DATE") {
      return (
        <Text color={textColor} fontSize='sm' fontWeight='700'>
          {cell.value}
        </Text>
      );
    } else if (cell.column.Header === "PROGRESS") {
      return (
        <Flex align='center'>
          <Progress
            variant='table'
            colorScheme='brandScheme'
            h='8px'
            w='108px'
            value={cell.value}
          />
        </Flex>
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
          pe='10px'
          key={column.id || index}
          borderColor={borderColor}>
          <Flex
            justify='space-between'
            align='center'
            fontSize={{ sm: "10px", lg: "12px" }}
            color='gray.400'>
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
            maxH='30px !important'
            py='8px'
            minW={{ sm: "150px", md: "200px", lg: "auto" }}
            borderColor='transparent'>
            {renderCell(cell, textColor)}
          </Td>
        ))}
      </Tr>
    );
  }, [prepareRow, renderCell]);

  return (
    <Card
      direction='column'
      w='100%'
      px='0px'
      overflowX={{ sm: "scroll", lg: "hidden" }}>
      <Flex px='25px' justify='space-between' mb='10px' align='center'>
        <Text
          color={textColor}
          fontSize='22px'
          fontWeight='700'
          lineHeight='100%'>
          Complex Table
        </Text>
        <Menu />
      </Flex>
      <Table {...getTableProps()} variant='simple' color='gray.500' mb='24px'>
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

export default ComplexTable;
