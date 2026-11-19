import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN_KOPERASI", "PENGURUS"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !allowedRoles.has(session.user.role)) {
    return new NextResponse("Tidak diizinkan.", { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Anggota");
  sheet.columns = [
    { header: "Nomor Anggota", key: "memberNumber", width: 18 },
    { header: "NIK (opsional)", key: "nik", width: 22, style: { numFmt: "@" } },
    { header: "NIP/NI", key: "employeeNumber", width: 22, style: { numFmt: "@" } },
    { header: "Nama", key: "name", width: 30 },
    { header: "Status Kepegawaian", key: "employmentStatus", width: 22 },
    { header: "Telepon", key: "phone", width: 18, style: { numFmt: "@" } },
    { header: "Alamat", key: "address", width: 36 },
    { header: "Tanggal Bergabung", key: "joinedAt", width: 20 },
    { header: "Status", key: "isActive", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.addRow({
    memberNumber: "PM-001",
    nik: "3578010101900001",
    employeeNumber: "",
    name: "Contoh Nama Anggota",
    employmentStatus: "PNS",
    phone: "081234567890",
    address: "Surabaya",
    joinedAt: "01/01/2026",
    isActive: "Aktif",
  });
  // Text format for the identity columns so Excel does not turn 16 digits into a number.
  for (let row = 3; row <= 502; row += 1) {
    for (const col of [2, 3, 6]) sheet.getCell(row, col).numFmt = "@";
  }
  for (let row = 2; row <= 502; row += 1) {
    sheet.getCell(row, 5).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"PNS,PPPK,PPPK Paruh Waktu"'],
    };
    sheet.getCell(row, 9).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Aktif,Nonaktif"'],
    };
  }

  const guide = workbook.addWorksheet("Petunjuk");
  guide.getColumn(1).width = 100;
  [
    "Isi data anggota di lembar 'Anggota', mulai baris ke-2. Baris contoh boleh dihapus.",
    "Wajib: Nomor Anggota, Nama (min. 3 huruf), Status Kepegawaian. NIK boleh dikosongkan dan dilengkapi nanti; jika diisi harus 16 angka.",
    "NIP/NI wajib diisi jika anggota ingin punya akun login (login memakai NIP/NI).",
    "Status Kepegawaian: PNS, PPPK, atau PPPK Paruh Waktu.",
    "Tanggal Bergabung: format dd/mm/yyyy. Jika kosong, dipakai tanggal hari ini.",
    "Status: Aktif atau Nonaktif. Jika kosong, dianggap Aktif.",
    "Kolom NIK, NIP/NI, dan Telepon harus berformat Teks agar angka nol di depan dan digit terakhir tidak hilang.",
    "Maksimal 500 baris per file. Jika ada satu baris bermasalah, tidak ada data yang diimpor.",
  ].forEach((line) => guide.addRow([line]));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-anggota.xlsx"',
    },
  });
}
