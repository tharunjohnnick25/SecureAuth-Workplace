const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const H = ["Test Case ID","Test Suite / Feature","Test Case Description","Preconditions","Test Steps","Test Data / Input","Expected Result","Actual Result","Status","Priority","Severity"];
const P = n => String(n).padStart(3,'0');
function save(fn, sn, data) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([H,...data]);
  ws['!cols'] = [{wch:17},{wch:32},{wch:55},{wch:32},{wch:42},{wch:38},{wch:52},{wch:45},{wch:10},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws, sn);
  XLSX.writeFile(wb, path.join(process.cwd(), fn));
  XLSX.writeFile(wb, path.join('D:\\Downloads', fn));
  console.log(`Generated ${fn} with ${data.length} test cases`);
}
