import { useCallback, useState } from "react";
import StockAttachmentsGalleryModal from "../components/stock-list/StockAttachmentsGalleryModal";

export function useStockAttachmentsGallery({ resolvePreviewUrl } = {}) {
    const [state, setState] = useState({
        isOpen: false,
        attachments: [],
        stockItemId: null,
        initialIndex: 0,
    });

    const openGallery = useCallback((attachments, stockItemId = null, initialIndex = 0) => {
        setState({
            isOpen: true,
            attachments: Array.isArray(attachments) ? attachments.filter(Boolean) : [],
            stockItemId,
            initialIndex,
        });
    }, []);

    const closeGallery = useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const galleryModal = (
        <StockAttachmentsGalleryModal
            isOpen={state.isOpen}
            onClose={closeGallery}
            attachments={state.attachments}
            stockItemId={state.stockItemId}
            initialIndex={state.initialIndex}
            resolvePreviewUrl={resolvePreviewUrl}
        />
    );

    return { openGallery, closeGallery, galleryModal };
}
