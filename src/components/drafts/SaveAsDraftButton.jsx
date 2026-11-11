import React from "react";
import { Button, Icon } from "@chakra-ui/react";
import { MdOutlineDrafts } from "react-icons/md";

/** Manual "Save as draft" button, shown next to the Save button. No API call, no validation. */
export default function SaveAsDraftButton({ onClick, isLoading = false, isDisabled = false }) {
  return (
    <Button
      variant="outline"
      size="sm"
      leftIcon={<Icon as={MdOutlineDrafts} />}
      onClick={onClick}
      isLoading={isLoading}
      isDisabled={isDisabled}
    >
      Save as draft
    </Button>
  );
}
