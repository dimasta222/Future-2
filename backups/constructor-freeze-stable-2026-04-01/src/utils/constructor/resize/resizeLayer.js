import { resizeTextLayer } from "./resizeTextLayer.js";
import { resizeImageLayer } from "./resizeImageLayer.js";
import { resizeShapeLayer } from "./resizeShapeLayer.js";

export function resizeLayer(args) {
  const layerType = args?.layer?.type;

  if (layerType === "text") {
    return resizeTextLayer(args);
  }

  if (layerType === "upload") {
    return resizeImageLayer(args);
  }

  return resizeShapeLayer(args);
}
