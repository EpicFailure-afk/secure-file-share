import { useContext } from "react";
import { HoverPreviewContext } from "./HoverPreview";

// Returns { schedule, openNow, hide, setDragging } or null if no provider.
// Returning null (rather than throwing) keeps rows usable in isolation/tests.
export const useHoverPreview = () => useContext(HoverPreviewContext);
