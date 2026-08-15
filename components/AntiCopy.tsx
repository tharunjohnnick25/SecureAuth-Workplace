'use client';

import { useEffect } from 'react';

// Prevents copying/selecting of website content (text, images, drag, devtools)
// while preserving copy & paste inside the app: input/textarea/contenteditable
// fields and elements explicitly marked with data-copy-allowed.
export default function AntiCopy() {
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!el) return false;
      const node = el as Element;
      if (typeof node.closest !== 'function') return false;
      return !!node.closest(
        'input, textarea, [contenteditable="true"], [contenteditable=""], [data-copy-allowed], .monaco-editor'
      );
    };

    // Draggable UI (e.g. kanban task cards) must still work while anti-copy is active
    const isDraggable = (el: EventTarget | null): boolean => {
      if (!el) return false;
      const node = el as Element;
      if (typeof node.closest !== 'function') return false;
      return !!node.closest('[draggable="true"], [data-drag-allowed]');
    };

    const prevent = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventCopy = (e: Event) => {
      if (isEditable(e.target)) return true;
      return prevent(e);
    };

    const preventPaste = (e: Event) => {
      // Pasting is only useful into editable fields; allow it there.
      if (isEditable(e.target)) return true;
      return prevent(e);
    };

    const preventContext = (e: Event) => {
      if (isEditable(e.target)) return true;
      return prevent(e);
    };

    const preventKeydown = (e: KeyboardEvent) => {
      const editableFocused = isEditable(document.activeElement);

      // Devtools / source / save protection (always blocked)
      if (
        e.key === 'F12' ||
        e.key === 'F5' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u') ||
        (e.ctrlKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault();
        return false;
      }

      // While typing in a field, allow standard shortcuts (Ctrl+C/V/A/X)
      if (editableFocused && e.ctrlKey && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) {
        return true;
      }

      // Block copy / paste / select-all of page content
      if (e.ctrlKey && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    };

    const preventDrag = (e: Event) => {
      if (isEditable(e.target)) return true;
      if (isDraggable(e.target)) return true;
      return prevent(e);
    };

    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('keydown', preventKeydown);
    document.addEventListener('dragstart', preventDrag);

    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('keydown', preventKeydown);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, []);

  return (
    <style>{`
      html, body {
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }
      input, textarea, [contenteditable="true"], [contenteditable=""], [data-copy-allowed], .monaco-editor {
        -webkit-user-select: text;
        -moz-user-select: text;
        user-select: text;
      }
    `}</style>
  );
}
