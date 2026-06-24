import { useCallback, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { deleteFormOptionApi, updateFormOptionApi } from "../api/formOptions";
import {
  canDeleteFormOption,
  canUpdateFormOption,
  parseFormOptionsMeta,
  resolveDeleteOptionType,
  resolveUpdateOptionType,
} from "../utils/formOptionDelete";

export default function useFormOptionDelete() {
  const toast = useToast();
  const [optionsDeleteApi, setOptionsDeleteApi] = useState("/api/form/options/delete");
  const [optionsUpdateApi, setOptionsUpdateApi] = useState("/api/form/options/update");
  const [deletableOptionTypes, setDeletableOptionTypes] = useState([
    "from",
    "location",
    "pic",
    "ship_by",
    "shipped_by",
    "to",
  ]);
  const [updatableOptionTypes, setUpdatableOptionTypes] = useState([
    "from",
    "location",
    "ship_by",
    "shipped_by",
    "to",
  ]);
  const [deletingOptionId, setDeletingOptionId] = useState(null);
  const [updatingOptionId, setUpdatingOptionId] = useState(null);

  const ingestOptionsResponse = useCallback((data) => {
    const meta = parseFormOptionsMeta(data);
    setOptionsDeleteApi(meta.optionsDeleteApi);
    setOptionsUpdateApi(meta.optionsUpdateApi);
    if (meta.deletableOptionTypes.length > 0) {
      setDeletableOptionTypes(meta.deletableOptionTypes);
    }
    if (meta.updatableOptionTypes.length > 0) {
      setUpdatableOptionTypes(meta.updatableOptionTypes);
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

  const updateFormOption = useCallback(
    async (fieldKey, option, nextName) => {
      const optionType = resolveUpdateOptionType(fieldKey, updatableOptionTypes);
      if (!canUpdateFormOption(option, optionType, updatableOptionTypes)) {
        return false;
      }

      setUpdatingOptionId(Number(option.id));
      try {
        const result = await updateFormOptionApi(optionsUpdateApi, {
          option_type: optionType,
          id: option.id,
          name: nextName,
        });
        toast({
          title: result?.message || "Option updated.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        return result;
      } catch (error) {
        toast({
          title: "Failed to update option",
          description: error?.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return false;
      } finally {
        setUpdatingOptionId(null);
      }
    },
    [optionsUpdateApi, toast, updatableOptionTypes]
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
          return deleted;
        },
        isDeletingOptionId: deletingOptionId,
      };
    },
    [deletableOptionTypes, deleteFormOption, deletingOptionId]
  );

  const getUpdateSelectProps = useCallback(
    (fieldKey, onUpdated) => ({
      canUpdateOption: (option) =>
        canUpdateFormOption(
          option,
          resolveUpdateOptionType(fieldKey, updatableOptionTypes),
          updatableOptionTypes
        ),
      onUpdateOption: async (option, nextName) => {
        const result = await updateFormOption(fieldKey, option, nextName);
        if (result) onUpdated?.(option, nextName, result);
        return result;
      },
      isUpdatingOptionId: updatingOptionId,
    }),
    [updateFormOption, updatableOptionTypes, updatingOptionId]
  );

  return {
    ingestOptionsResponse,
    deleteFormOption,
    updateFormOption,
    getDeleteSelectProps,
    getUpdateSelectProps,
    deletingOptionId,
    updatingOptionId,
    deletableOptionTypes,
    updatableOptionTypes,
    optionsDeleteApi,
    optionsUpdateApi,
  };
}
