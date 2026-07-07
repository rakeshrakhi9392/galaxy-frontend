"use client";

import { useSyncExternalStore } from "react";

let lockCount = 0;
let wheelBlockerAttached = false;
const zoomLockListeners = new Set<() => void>();
const closeListeners = new Set<() => void>();

const COMBOBOX_SCROLL_SELECTOR = "[data-combobox-scroll]";

function subscribeZoomLock(listener: () => void) {
  zoomLockListeners.add(listener);
  return () => {
    zoomLockListeners.delete(listener);
  };
}

function getZoomLockSnapshot() {
  return lockCount > 0;
}

function getZoomLockServerSnapshot() {
  return false;
}

function notifyZoomLock() {
  zoomLockListeners.forEach((listener) => listener());
}

function isComboboxScrollTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(COMBOBOX_SCROLL_SELECTOR) !== null;
}

function handleBlockedWheel(event: WheelEvent) {
  if (isComboboxScrollTarget(event.target)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function updateWheelBlocker() {
  if (lockCount > 0 && !wheelBlockerAttached) {
    window.addEventListener("wheel", handleBlockedWheel, { capture: true, passive: false });
    wheelBlockerAttached = true;
    return;
  }
  if (lockCount === 0 && wheelBlockerAttached) {
    window.removeEventListener("wheel", handleBlockedWheel, { capture: true });
    wheelBlockerAttached = false;
  }
}

export function acquireCanvasZoomLock() {
  lockCount += 1;
  updateWheelBlocker();
  notifyZoomLock();
  return () => {
    lockCount = Math.max(0, lockCount - 1);
    updateWheelBlocker();
    notifyZoomLock();
  };
}

export function useIsCanvasZoomLocked(): boolean {
  return useSyncExternalStore(subscribeZoomLock, getZoomLockSnapshot, getZoomLockServerSnapshot);
}

export function subscribeComboboxClose(listener: () => void) {
  closeListeners.add(listener);
  return () => {
    closeListeners.delete(listener);
  };
}

export function closeAllComboboxes() {
  closeListeners.forEach((listener) => listener());
}
