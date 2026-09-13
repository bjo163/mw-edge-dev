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
  "resource.notFound.title": "Resource not found",
  "resource.notFound.description": "The requested resource is unavailable or not exposed by the current metadata.",
  "route.notFound.title": "Page not found",
  "route.notFound.description": "This route is not supported by the current MW Edge shell.",
  "action.back": "Back",
  "state.loading": "Loading",
  "state.empty": "No data yet",
  "state.error": "Something went wrong",
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
  "resource.notFound.title": "Resource tidak ditemukan",
  "resource.notFound.description": "Resource yang diminta tidak tersedia atau tidak diekspos oleh metadata saat ini.",
  "route.notFound.title": "Halaman tidak ditemukan",
  "route.notFound.description": "Route ini belum didukung oleh MW Edge shell saat ini.",
  "action.back": "Kembali",
  "state.loading": "Memuat",
  "state.empty": "Belum ada data",
  "state.error": "Terjadi kesalahan",
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
