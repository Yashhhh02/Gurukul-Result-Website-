import xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function inspectFile(filename) {
  const workbook = xlsx.readFile(path.resolve(`public/${filename}`));
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  let out = `\nInspecting ${filename}...\n`;
  for (let i = 0; i < rows[1].length; i++) {
    out += `Col ${i}: ${rows[0][i]} | ${rows[1][i]} | ${rows[2][i]}\n`;
  }
  fs.appendFileSync('inspect_v2_out.txt', out);
}

fs.writeFileSync('inspect_v2_out.txt', ''); // clear file
inspectFile('IT_Students_WithGeography_v2.xlsx');
inspectFile('IT_Students_WithoutGeography_v2.xlsx');
