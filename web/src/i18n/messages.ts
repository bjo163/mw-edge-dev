export type Locale = "en" | "id";

const en = {
  "app.loading": "Loading…",
  "auth.username": "Username",
  "auth.password": "Password",
  "auth.enter": "Enter",
  "auth.rotate.title": "Set a new admin password",
  "auth.rotate.description": "The bootstrap credential is one-time only.",
  "auth.rotate.action": "Rotate password",
  "nav.logout": "Logout",
  "resource.create": "Create record",
  "resource.select": "Select a resource",
  "resource.selectOption": "Select…",
  "resource.editor.required": "Explicit editor required.",
  "resource.createFailed": "Create failed",
  "resource.validationSummary": "Please review the errors",
  "resource.notFound.title": "Resource not found",
  "resource.notFound.description": "The requested resource is unavailable or not exposed by the current metadata.",
  "resource.filter.field": "Filter field",
  "resource.filter.value": "Filter value",
  "resource.filter.apply": "Apply filter",
  "resource.filter.any": "Any",
  "resource.filter.true": "True",
  "resource.filter.false": "False",
  "resource.filters.active": "Active filters",
  "resource.columns": "Columns",
  "resource.results": "results",
  "route.notFound.title": "Page not found",
  "route.notFound.description": "This route is not supported by the current MW Edge shell.",
  "action.back": "Back",
  "action.retry": "Retry",
  "action.previous": "Previous",
  "action.next": "Next",
  "state.loading": "Loading",
  "state.empty": "No data yet",
  "state.filteredEmpty.title": "No matching records",
  "state.filteredEmpty.description": "Change or clear the active filters.",
  "state.permissionDenied.title": "Permission denied",
  "state.permissionDenied.description": "Your account does not have permission to read this resource.",
  "state.unavailable.title": "Resource unavailable",
  "state.unavailable.description": "This resource is not available from the current server metadata or endpoint.",
  "state.error": "Something went wrong",
  "state.technicalDetails": "Technical details",
  "state.requestId": "Request ID",
} as const;

type MessageKey = keyof typeof en;

const id: Record<MessageKey, string> = {
  "app.loading": "Memuat…",
  "auth.username": "Nama pengguna",
  "auth.password": "Kata sandi",
  "auth.enter": "Masuk",
  "auth.rotate.title": "Buat kata sandi admin baru",
  "auth.rotate.description": "Kredensial bootstrap hanya dapat digunakan satu kali.",
  "auth.rotate.action": "Ganti kata sandi",
  "nav.logout": "Keluar",
  "resource.create": "Buat data",
  "resource.select": "Pilih resource",
  "resource.selectOption": "Pilih…",
  "resource.editor.required": "Editor khusus diperlukan.",
  "resource.createFailed": "Pembuatan data gagal",
  "resource.validationSummary": "Periksa kembali kesalahan berikut",
  "resource.notFound.title": "Resource tidak ditemukan",
  "resource.notFound.description": "Resource yang diminta tidak tersedia atau tidak diekspos oleh metadata saat ini.",
  "resource.filter.field": "Kolom filter",
  "resource.filter.value": "Nilai filter",
  "resource.filter.apply": "Terapkan filter",
  "resource.filter.any": "Semua",
  "resource.filter.true": "Ya",
  "resource.filter.false": "Tidak",
  "resource.filters.active": "Filter aktif",
  "resource.columns": "Kolom",
  "resource.results": "hasil",
  "route.notFound.title": "Halaman tidak ditemukan",
  "route.notFound.description": "Route ini belum didukung oleh MW Edge shell saat ini.",
  "action.back": "Kembali",
  "action.retry": "Coba lagi",
  "action.previous": "Sebelumnya",
  "action.next": "Berikutnya",
  "state.loading": "Memuat",
  "state.empty": "Belum ada data",
  "state.filteredEmpty.title": "Tidak ada data yang cocok",
  "state.filteredEmpty.description": "Ubah atau hapus filter aktif.",
  "state.permissionDenied.title": "Akses ditolak",
  "state.permissionDenied.description": "Akun Anda tidak memiliki izin untuk membaca resource ini.",
  "state.unavailable.title": "Resource tidak tersedia",
  "state.unavailable.description": "Resource ini tidak tersedia dari metadata atau endpoint server saat ini.",
  "state.error": "Terjadi kesalahan",
  "state.technicalDetails": "Detail teknis",
  "state.requestId": "ID permintaan",
};

const catalogs: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = { en, id };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "id";
}

export function message(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key] ?? en[key];
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) return value;
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("id")) return "id";
  return "en";
}

export type { MessageKey };
