import DeleteModule, { moduleMeta as deleteMeta, applyOperation as applyDelete } from "./DeleteModule";
import ReorderModule, { moduleMeta as reorderMeta, applyOperation as applyReorder } from "./ReorderModule";
import CropModule, { moduleMeta as cropMeta, applyOperation as applyCrop } from "./CropModule";
import MergeModule, { moduleMeta as mergeMeta, applyOperation as applyMerge } from "./MergeModule";

export const MODULES = [
  { ...deleteMeta, Component: DeleteModule, apply: applyDelete },
  { ...reorderMeta, Component: ReorderModule, apply: applyReorder },
  { ...cropMeta, Component: CropModule, apply: applyCrop },
  { ...mergeMeta, Component: MergeModule, apply: applyMerge },
];
