"use server";

import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN_KOPERASI", "PENGURUS"]);
const MAX_ROWS = 500;
const MAX_BYTES = 2_000_000;

export type ImportState = {
  status?: "success" | "error";
  message?: string;
  imported?: number;
  accounts?: number;
  withoutNip?: number;
  rowErrors?: { row: number; message: string }[];
};

const employmentMap: Record<string, "PNS" | "PPPK" | "PPPK_PARUH_WAKTU"> = {
  pns: "PNS",
  pppk: "PPPK",
  "pppk paruh waktu": "PPPK_PARUH_WAKTU",
  "paruh waktu": "PPPK_PARUH_WAKTU",
  pppk_paruh_waktu: "PPPK_PARUH_WAKTU",
};

const rowSchema = z.object({
  memberNumber: z.string().min(1, "Nomor anggota kosong."),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 angka."),
  employeeNumber: z.string().optional(),
  name: z.string().min(3, "Nama minimal 3 karakter."),
  employmentStatus: z.enum(["PNS", "PPPK", "PPPK_PARUH_WAKTU"], {
    error: "Status kepegawaian harus PNS, PPPK, atau PPPK Paruh Waktu.",
  }),
  phone: z.string().optional(),
  address: z.string().optional(),
  joinedAt: z.date({ error: "Tanggal bergabung tidak valid." }),
  isActive: z.boolean(),
});

/** Excel cell value to trimmed text. Numbers are returned as a marker for the caller. */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return String(value.result ?? "").trim();
    return "";
  }
  return String(value).trim();
}

function cellDate(cell: ExcelJS.Cell): Date | null | undefined {
  const value = cell.value;
  if (value === null || value === undefined || value === "") return undefined; // blank
  if (value instanceof Date) return value;
  const text = cellText(cell);
  // dd/mm/yyyy or dd-mm-yyyy
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (match) {
    const date = new Date(Date.UTC(+match[3], +match[2] - 1, +match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function importMembers(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await getServerSession(authOptions);
  if (!session || !allowedRoles.has(session.user.role)) {
    return { status: "error", message: "Anda tidak memiliki akses untuk mengimpor anggota." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Pilih file Excel (.xlsx) terlebih dahulu." };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { status: "error", message: "Format file harus .xlsx. Gunakan template yang disediakan." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "Ukuran file maksimal 2 MB." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { status: "error", message: "File tidak dapat dibaca. Pastikan file adalah Excel (.xlsx) yang valid." };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { status: "error", message: "File Excel tidak memiliki lembar kerja." };

  type Parsed = z.infer<typeof rowSchema>;
  const parsedRows: { row: number; data: Parsed }[] = [];
  const rowErrors: { row: number; message: string }[] = [];

  let dataRows = 0;
  sheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
    if (rowNumber === 1) return; // header
    const texts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => cellText(excelRow.getCell(col)));
    if (texts.every((text) => text === "")) return;
    dataRows += 1;
    if (dataRows > MAX_ROWS) return;

    const nikCell = excelRow.getCell(2);
    if (typeof nikCell.value === "number") {
      rowErrors.push({
        row: rowNumber,
        message: "NIK terbaca sebagai angka sehingga digit terakhir bisa berubah. Ubah kolom NIK menjadi format Teks.",
      });
      return;
    }

    const joined = cellDate(excelRow.getCell(8));
    const activeText = texts[8].toLowerCase();
    const result = rowSchema.safeParse({
      memberNumber: texts[0],
      nik: texts[1],
      employeeNumber: texts[2] || undefined,
      name: texts[3],
      employmentStatus: employmentMap[texts[4].toLowerCase()] ?? texts[4],
      phone: texts[5] || undefined,
      address: texts[6] || undefined,
      joinedAt: joined === undefined ? new Date() : (joined ?? undefined),
      isActive: activeText === "" || ["aktif", "ya", "true", "1"].includes(activeText),
    });

    if (!result.success) {
      rowErrors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => issue.message).join(" "),
      });
      return;
    }
    parsedRows.push({ row: rowNumber, data: result.data });
  });

  if (dataRows === 0) {
    return { status: "error", message: "Tidak ada data anggota di file. Isi mulai baris ke-2, di bawah header." };
  }
  if (dataRows > MAX_ROWS) {
    return { status: "error", message: `Maksimal ${MAX_ROWS} baris per impor. File Anda berisi ${dataRows} baris.` };
  }

  // Duplicates inside the file
  for (const key of ["memberNumber", "nik", "employeeNumber"] as const) {
    const seen = new Map<string, number>();
    for (const { row, data } of parsedRows) {
      const value = data[key];
      if (!value) continue;
      const first = seen.get(value);
      if (first) {
        rowErrors.push({
          row,
          message: `${labelOf(key)} ${value} sama dengan baris ${first} di file.`,
        });
      } else {
        seen.set(value, row);
      }
    }
  }

  // Duplicates already in the database
  if (parsedRows.length) {
    const existing = await prisma.member.findMany({
      where: {
        OR: [
          { memberNumber: { in: parsedRows.map(({ data }) => data.memberNumber) } },
          { nik: { in: parsedRows.map(({ data }) => data.nik) } },
          {
            employeeNumber: {
              in: parsedRows.flatMap(({ data }) => (data.employeeNumber ? [data.employeeNumber] : [])),
            },
          },
        ],
      },
      select: { memberNumber: true, nik: true, employeeNumber: true },
    });
    const numbers = new Set(existing.map((m) => m.memberNumber));
    const niks = new Set(existing.map((m) => m.nik));
    const employees = new Set(existing.flatMap((m) => (m.employeeNumber ? [m.employeeNumber] : [])));
    for (const { row, data } of parsedRows) {
      if (numbers.has(data.memberNumber))
        rowErrors.push({ row, message: `Nomor anggota ${data.memberNumber} sudah terdaftar.` });
      if (niks.has(data.nik)) rowErrors.push({ row, message: `NIK ${data.nik} sudah terdaftar.` });
      if (data.employeeNumber && employees.has(data.employeeNumber))
        rowErrors.push({ row, message: `NIP/NI ${data.employeeNumber} sudah terdaftar.` });
    }
  }

  if (rowErrors.length) {
    rowErrors.sort((a, b) => a.row - b.row);
    return {
      status: "error",
      message: `Tidak ada data yang diimpor. Perbaiki ${rowErrors.length} masalah berikut lalu unggah ulang.`,
      rowErrors: rowErrors.slice(0, 100),
    };
  }

  const createAccounts = formData.get("createAccounts") === "on";
  const withNip = parsedRows.filter(({ data }) => data.employeeNumber);

  // Password awal = NIP/NI; anggota wajib menggantinya saat masuk pertama kali.
  const accountRows = createAccounts
    ? await Promise.all(
        withNip.map(async ({ data }) => ({
          nik: data.nik,
          name: data.name,
          email: `${data.employeeNumber!.toLowerCase()}@anggota.praja-makmur.local`,
          password: await bcrypt.hash(data.employeeNumber!, 10),
        })),
      )
    : [];

  let accounts = 0;
  await prisma.$transaction(async (tx) => {
    await tx.member.createMany({
      data: parsedRows.map(({ data }) => ({
        ...data,
        employeeNumber: data.employeeNumber ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
      })),
    });
    if (!accountRows.length) return;
    const members = await tx.member.findMany({
      where: { nik: { in: accountRows.map((row) => row.nik) } },
      select: { id: true, nik: true },
    });
    const idByNik = new Map(members.map((member) => [member.nik, member.id]));
    const created = await tx.user.createMany({
      data: accountRows.map((row) => ({
        name: row.name,
        email: row.email,
        password: row.password,
        role: "ANGGOTA" as const,
        isActive: true,
        mustChangePassword: true,
        memberId: idByNik.get(row.nik),
      })),
      skipDuplicates: true,
    });
    accounts = created.count;
  });

  revalidatePath("/anggota");
  revalidatePath("/pengaturan/akun");
  const withoutNip = createAccounts ? parsedRows.length - withNip.length : 0;
  return {
    status: "success",
    imported: parsedRows.length,
    accounts,
    withoutNip,
    message: `${parsedRows.length} anggota berhasil diimpor.`,
  };
}

function labelOf(key: "memberNumber" | "nik" | "employeeNumber") {
  return key === "memberNumber" ? "Nomor anggota" : key === "nik" ? "NIK" : "NIP/NI";
}
