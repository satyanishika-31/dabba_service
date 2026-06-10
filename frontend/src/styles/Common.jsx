// Shared site palette
export const C_LIGHT = "#896A67";
export const C_ACCENT = "#7A5C5F";
export const C_PRIMARY = "#6B4D57";
export const C_DARK = "#3F2A32";

// Literal Tailwind classes so the compiler can discover every palette color.
export const bgPage = "bg-[#896A67]/10";
export const bgSurface = "bg-white";
export const bgSoft = "bg-[#896A67]/10";
export const bgPrimary = "bg-[#3F2A32]";
export const bgPrimaryHover = "hover:bg-[#6B4D57]";
export const bgAccent = "bg-[#7A5C5F]";
export const bgAccentHover = "hover:bg-[#6B4D57]";
export const textDark = "text-[#3F2A32]";
export const textAccent = "text-[#7A5C5F]";
export const textLight = "text-[#896A67]";
export const textPrimary = "text-[#6B4D57]";
export const borderLight = "border-[#896A67]/35";
export const borderPrimary = "border-[#6B4D57]/35";
export const borderAccent = "border-[#7A5C5F]/35";
export const focusPrimary = "focus:border-[#6B4D57]";
export const progressTrack = "bg-[#896A67]/20";

export const pageBackground = `min-h-screen ${bgPage} ${textDark}`;
export const pageWrapper = "max-w-7xl mx-auto px-4 py-10 sm:px-6";
export const section = "mb-16";
export const pageTitle = `text-4xl font-black tracking-tight ${textDark}`;
export const heading = `text-lg font-black ${textDark}`;
export const body = `text-base leading-7 ${textAccent}`;
export const muted = textAccent;

export const navbar = `sticky top-0 z-50 border-b ${borderLight} bg-white/95 backdrop-blur`;
export const navContainer = "mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6";
export const navBrand = `flex items-center gap-3 ${textDark}`;
export const navLinks = "hidden items-center gap-7 md:flex";
export const navLinkBase = "text-sm font-semibold transition";
export const navLink = `${navLinkBase} ${textAccent} hover:text-[#3F2A32]`;
export const navLinkActive = `${navLinkBase} ${textDark}`;
export const navBtnPrimary = `rounded-md ${bgPrimary} px-4 py-2 text-sm font-bold text-white ${bgPrimaryHover}`;
export const navBtnSecondary = `rounded-md border ${borderLight} px-3 py-2 text-sm font-semibold ${textDark}`;

export const heroTitle = `mt-4 max-w-3xl text-5xl font-black tracking-tight ${textDark} sm:text-6xl`;
export const heroSubtitle = `mt-5 max-w-2xl text-lg leading-8 ${textAccent}`;
export const heroActions = "mt-8 flex flex-wrap gap-3";
export const heroBtnPrimary = `rounded-md ${bgPrimary} px-5 py-3 text-sm font-black text-white ${bgPrimaryHover}`;
export const heroBtnSecondary = `rounded-md border ${borderLight} px-5 py-3 text-sm font-black ${textDark} hover:bg-white`;

export const card = `rounded-lg border ${borderLight} ${bgSurface} shadow-sm`;
export const cardPadded = `${card} p-5`;
export const cardLarge = `${card} p-6`;
export const articleCard = `overflow-hidden rounded-lg border ${borderLight} ${bgPage}`;
export const campaignTitle = `text-lg font-black ${textDark}`;
export const campaignExcerpt = `text-sm leading-6 ${textAccent}`;
export const campaignMeta = `text-xs font-black uppercase tracking-wide ${textLight}`;
export const statusActive = `rounded-md ${bgSoft} px-3 py-2 text-xs font-black ${textDark}`;
export const statusDeleted = "rounded-md bg-black/10 px-3 py-2 text-xs font-black text-black";
export const emptyState = `rounded-lg border ${borderLight} ${bgSurface} p-5 text-sm ${textAccent}`;

export const btnPrimary = `rounded-md ${bgPrimary} px-4 py-3 font-black text-white ${bgPrimaryHover}`;
export const btnSecondary = `rounded-md border ${borderLight} px-4 py-3 font-black ${textDark} hover:bg-[#896A67]/10`;
export const btnGhost = `${textAccent} font-semibold hover:text-[#3F2A32] transition`;
export const btnAccent = `rounded-md ${bgAccent} px-4 py-3 font-black text-white ${bgAccentHover}`;

export const formCard = `rounded-lg border ${borderLight} ${bgSurface} p-6 shadow-sm sm:p-8`;
export const formTitle = `text-4xl font-black tracking-tight ${textDark} sm:text-5xl`;
export const label = `text-sm font-bold ${textDark}`;
export const input = `rounded-md border ${borderLight} px-4 py-3 outline-none ${focusPrimary}`;
export const formGroup = "block";
export const divider = `border-t ${borderLight} my-5`;
export const error = "text-xs text-red-600 mt-1";
export const submit = `w-full ${btnPrimary} disabled:opacity-60`;
export const loading = `text-sm font-semibold ${textAccent}`;

export const footerSection = `border-t ${borderLight} ${bgPrimary} px-6 py-8 text-center text-sm text-white`;
export const footer = footerSection;
export const footerLink = `${textLight} hover:text-white transition`;
export const footerContainer = "max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10";
export const footerBrand = `text-3xl font-bold mb-4 ${textLight}`;
export const footerText = `leading-relaxed ${textLight}`;
export const footerHeading = `font-semibold mb-4 text-lg ${textLight}`;
export const footerList = `space-y-3 ${textLight}`;
export const footerContact = textLight;
export const footerBottom = `border-t ${borderAccent} py-5 text-center text-sm`;
export const footerCopyright = textLight;
