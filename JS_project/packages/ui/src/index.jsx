import React, { useMemo } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ModuleRegistry } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";
ModuleRegistry.registerModules([ClientSideRowModelModule]);

export function SqlEditor({ value, onChange, disabled }) {
  return <textarea className="sql-editor" aria-label="SQL" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} spellCheck="false" />;
}

export function ResultGrid({ columns = [], rows = [] }) {
  const columnDefs = useMemo(() => columns.map((column) => ({ field: column.field ?? column, headerName: column.label ?? column.field ?? column, sortable: true, filter: true, resizable: true })), [columns]);
  return <div className="ag-theme-quartz result-grid"><AgGridReact rowData={rows} columnDefs={columnDefs} rowSelection={{ mode: "singleRow", enableClickSelection: true }} cellSelection enableCellTextSelection /></div>;
}
