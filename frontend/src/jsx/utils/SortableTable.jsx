import { useState, useMemo } from "react";

export default function SortableTable({ data, columns }) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  function requestSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
      <table className="scores-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => requestSort(col.key)}>
                {col.label}
                {sortConfig.key === col.key && (
                  <span> {sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
  );
}
