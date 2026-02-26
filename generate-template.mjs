import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function generate() {
    const ws_data = [["מספר דירה", "קומה", "הערות"]];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "דירות");

    const targetDir = path.join(process.cwd(), "apps/web/public/templates");
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    XLSX.writeFile(wb, path.join(targetDir, "units-import-template.xlsx"));
    console.log("Template generated at apps/web/public/templates/units-import-template.xlsx");
}

generate();
