import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('public/IT_Marks_File_final-2.xlsx');
const buffer = fs.readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Total rows:", rows.length);
console.log("\nFirst 8 rows:");
for (let i = 0; i < Math.min(8, rows.length); i++) {
  console.log(`Row ${i}:`, rows[i]);
}
