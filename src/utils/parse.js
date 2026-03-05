// src/utils/parse.js
export function toNumber(x) {
    if (x === null || x === undefined) return NaN
    const s = String(x).trim()
    if (s === "" || s.toLowerCase() === "null" || s.toLowerCase() === "nan") return NaN
    // 处理 "1,234" 这种
    return Number(s.replace(/,/g, ""))
}

export function parseYear(releaseDateStr) {
    // 你数据里可能是 "Jan 1, 2020" 或 "2020-01-01" 或空
    if (!releaseDateStr) return NaN
    const s = String(releaseDateStr).trim()
    if (!s) return NaN
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.getFullYear()
    // 兜底：提取 4 位年份
    const m = s.match(/(19|20)\d{2}/)
    return m ? Number(m[0]) : NaN
}

export function splitList(str) {
    // Genres / Tags 这类字段：逗号分隔
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