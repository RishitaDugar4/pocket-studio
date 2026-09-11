"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { dropBridge } from "./dropBridge";

/** Publishes the live render camera so DOM drops can be projected onto the floor. */
export function DropBridgeBinding() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    dropBridge.camera = camera;
    return () => {
      if (dropBridge.camera === camera) dropBridge.camera = null;
    };
  }, [camera]);
  return null;
}
