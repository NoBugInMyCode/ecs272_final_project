export function toNumber(v) {
    if (v == null || v === "") return 0
    const n = Number(String(v).replace(/,/g, "").trim())
    return Number.isFinite(n) ? n : 0
}

export function parseYear(releaseDateStr) {
    if (!releaseDateStr) return NaN

    const s = String(releaseDateStr).trim()
    if (!s) return NaN

    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()

    const m = s.match(/(19|20)\d{2}/)
    return m ? Number(m[0]) : NaN
}

export function splitList(str) {
    if (!str) return []
    return String(str)
        .split(",")
        .map(d => d.trim())
        .filter(Boolean)
}

export function priceBand(price) {
    if (!Number.isFinite(price)) return "Unknown"
    if (price <= 0) return "Free"
    if (price < 10) return "0-10"
    if (price < 30) return "10-30"
    if (price < 60) return "30-60"
    return "60+"
}