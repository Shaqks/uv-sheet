import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './helpers.js';

export function exportToCSV(data, columns, filenamePrefix = 'Export') {
  if (!data || !data.length) return;

  const dateStr = formatDate(new Date()).replace(/\//g, '-');
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  // Headers
  const headers = columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');
  
  // Rows
  const rows = data.map(row => {
    return columns.map(col => {
      let val = row[col.key];
      if (val === undefined || val === null) val = '';
      
      // Formatting
      if (col.format === 'currency' && typeof val === 'number') {
        val = val.toString(); // Don't include commas/symbols in CSV numbers
      } else if (col.format === 'date') {
        val = formatDate(val);
      }
      
      // Escape quotes and wrap in quotes
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadFile(blob, filename);
}

export function exportToExcel(data, columns, filenamePrefix = 'Export') {
  if (!data || !data.length) return;

  const dateStr = formatDate(new Date()).replace(/\//g, '-');
  const filename = `${filenamePrefix}_${dateStr}.xlsx`;

  // Map data to column headers
  const exportData = data.map(row => {
    const newRow = {};
    columns.forEach(col => {
      let val = row[col.key];
      
      // Format dates as strings for better Excel display if we don't want to mess with Excel date formats
      if (col.format === 'date') {
        val = formatDate(val);
      }
      
      newRow[col.label] = val;
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  XLSX.writeFile(workbook, filename);
}

function downloadFile(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
