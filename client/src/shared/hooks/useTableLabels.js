import { useEffect } from "react";

/** Copies each column header's text onto its cells as data-label. */
const labelTable = (table) => {
  const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
  if (!headers.length) return;
  table.querySelectorAll("tbody tr").forEach((row) => {
    [...row.children].forEach((cell, index) => {
      const label = headers[index] || "";
      if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
    });
  });
};

/**
 * On phones, data tables render as stacked cards (see .table-responsive in
 * index.css) and each value needs its column name beside it. One observer
 * labels every table in the app, including rows that load later.
 */
export const useTableLabels = () => {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => document.querySelectorAll("table.data-table").forEach(labelTable));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
};
