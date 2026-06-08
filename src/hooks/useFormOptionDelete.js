import { useCallback, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { deleteFormOptionApi } from "../api/formOptions";
import {
  canDeleteFormOption,
  parseFormOptionsMeta,
  resolveDeleteOptionType,
} from "../utils/formOptionDelete";

export default function useFormOptionDelete() {
  const toast = useToast();
  const [optionsDeleteApi, setOptionsDeleteApi] = useState("/api/form/options/delete");
  const [deletableOptionTypes, setDeletableOptionTypes] = useState([
    "from",
    "location",
    "pic",
    "ship_by",
    "shipped_by",
    "to",
  ]);
  const [deletingOptionId, setDeletingOptionId] = useState(null);

  const ingestOptionsResponse = useCallback((data) => {
    const meta = parseFormOptionsMeta(data);
    setOptionsDeleteApi(meta.optionsDeleteApi);
    if (meta.deletableOptionTypes.length > 0) {
      setDeletableOptionTypes(meta.deletableOptionTypes);
    }
  }, []);

  const deleteFormOption = useCallback(
    async (fieldKey, option) => {
      const optionType = resolveDeleteOptionType(fieldKey, deletableOptionTypes);
      if (!canDeleteFormOption(option, optionType, deletableOptionTypes)) {
        return false;
      }

      setDeletingOptionId(Number(option.id));
      try {
        const result = await deleteFormOptionApi(optionsDeleteApi, {
          option_type: optionType,
          id: option.id,
        });
        toast({
          title: result?.message || "Option deleted.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        return true;
      } catch (error) {
        toast({
          title: "Failed to delete option",
          description: error?.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return false;
      } finally {
        setDeletingOptionId(null);
      }
    },
    [deletableOptionTypes, optionsDeleteApi, toast]
  );

  const getDeleteSelectProps = useCallback(
    (fieldKey, onDeleted) => {
      const optionType = resolveDeleteOptionType(fieldKey, deletableOptionTypes);
      return {
        canDeleteOption: (option) =>
          canDeleteFormOption(option, optionType, deletableOptionTypes),
        onDeleteOption: async (option, event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          const deleted = await deleteFormOption(fieldKey, option);
          if (deleted) onDeleted?.(option);
        },
        isDeletingOptionId: deletingOptionId,
      };
    },
    [deletableOptionTypes, deleteFormOption, deletingOptionId]
  );

  return {
    ingestOptionsResponse,
    deleteFormOption,
    getDeleteSelectProps,
    deletingOptionId,
    deletableOptionTypes,
    optionsDeleteApi,
  };
}
