import { useEffect, useMemo, useState } from "react"
import * as d3 from "d3"
import { parseYear, splitList, priceBand, toNumber } from "../utils/parse"

function parseOwnersRange(str) {
    if (!str || str === "0") {
        return {
            ownersLabel: "0 - 0",
            ownersMin: 0,
            ownersMax: 0,
            ownersMid: 0,
        }
    }

    const cleaned = String(str).replace(/,/g, "").trim()
    const parts = cleaned.split("-").map(d => d.trim())

    if (parts.length !== 2) {
        return {
            ownersLabel: cleaned,
            ownersMin: NaN,
            ownersMax: NaN,
            ownersMid: NaN,
        }
    }

    const min = Number(parts[0])
    const max = Number(parts[1])

    return {
        ownersLabel: cleaned,
        ownersMin: Number.isFinite(min) ? min : NaN,
        ownersMax: Number.isFinite(max) ? max : NaN,
        ownersMid:
            Number.isFinite(min) && Number.isFinite(max)
                ? (min + max) / 2
                : NaN,
    }
}

function getField(row, candidates, fallback = "") {
    for (const key of candidates) {
        if (row?.[key] != null) return row[key]
    }

    const normalizedMap = Object.fromEntries(
        Object.keys(row || {}).map(k => [
            k.trim().replace(/^\uFEFF/, "").toLowerCase(),
            row[k],
        ])
    )

    for (const key of candidates) {
        const hit = normalizedMap[String(key).trim().toLowerCase()]
        if (hit != null) return hit
    }

    return fallback
}

function parseCleanNumber(value) {
    if (value == null) return 0

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0
    }

    let s = String(value)

    s = s
        .replace(/\uFEFF/g, "")
        .replace(/\u200B/g, "")
        .replace(/\u00A0/g, " ")
        .trim()

    if (
        s === "" ||
        s === "-" ||
        s === "--" ||
        s.toLowerCase() === "n/a" ||
        s.toLowerCase() === "na" ||
        s.toLowerCase() === "null" ||
        s.toLowerCase() === "undefined"
    ) {
        return 0
    }

    s = s.replace(/^"(.*)"$/, "$1").trim()
    s = s.replace(/[−–—]/g, "-")
    s = s.replace(/,/g, "").replace(/\s+/g, "")
    s = s.replace(/[^0-9.-]/g, "")

    const n = Number(s)
    return Number.isFinite(n) ? n : 0
}

function parseBoolean(value) {
    if (typeof value === "boolean") return value
    return String(value).trim().toLowerCase() === "true"
}

function parseMaybeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean)

    if (typeof value === "string") {
        const trimmed = value.trim()

        if (!trimmed) return []
        if (
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith('["') && trimmed.endsWith('"]'))
        ) {
            try {
                const normalized = trimmed.replace(/'/g, '"')
                const arr = JSON.parse(normalized)
                return Array.isArray(arr) ? arr.filter(Boolean) : []
            } catch {
                // 解析失败时退回普通 split
            }
        }

        return splitList(trimmed)
    }

    return []
}

export function useGamesData() {
    const [raw, setRaw] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                setLoading(true)
                setError(null)

                const rows = await d3.json("/games_slim.json")
                if (cancelled) return

                if (!Array.isArray(rows) || rows.length === 0) {
                    console.warn("games.json is not a non-empty array:", rows)
                    setRaw([])
                    setLoading(false)
                    return
                }

                console.log("JSON keys:", Object.keys(rows[0] || {}))
                console.log("First raw JSON row:", rows[0])

                const data = rows.map((row, index) => {
                    const rawPositive = getField(row, [
                        "Positive",
                        "positive",
                        "Positive reviews",
                        "positive_ratings",
                    ])

                    const rawNegative = getField(row, [
                        "Negative",
                        "negative",
                        "Negative reviews",
                        "negative_ratings",
                    ])

                    const positive = parseCleanNumber(rawPositive)
                    const negative = parseCleanNumber(rawNegative)

                    const price = toNumber(getField(row, ["Price", "price"]))
                    const peakCCU = toNumber(getField(row, ["Peak CCU", "peak_ccu", "PeakCCU"]))
                    const year = parseYear(
                        getField(row, ["Release date", "release_date", "Release Date"])
                    )

                    const totalReviews = positive + negative
                    const posRatio =
                        totalReviews > 0 &&
                        Number.isFinite(positive) &&
                        Number.isFinite(negative)
                            ? positive / totalReviews
                            : NaN

                    const gameName = getField(row, ["Name", "name"], "Unknown")
                    const appId = getField(row, ["AppID", "appid", "App Id"], String(index))

                    if (appId === "578080" || gameName === "PUBG: BATTLEGROUNDS") {
                        console.log("PUBG JSON ROW:", row)
                        console.log("PUBG rawPositive:", rawPositive)
                        console.log("PUBG rawNegative:", rawNegative)
                        console.log("PUBG parsed positive:", positive)
                        console.log("PUBG parsed negative:", negative)
                    }

                    const ownersParsed = parseOwnersRange(
                        getField(row, ["Estimated owners", "estimated_owners"], "0 - 0")
                    )

                    return {
                        id: appId,
                        name: gameName,
                        releaseDate: getField(
                            row,
                            ["Release date", "release_date", "Release Date"],
                            ""
                        ),
                        year,

                        price,
                        priceBand: priceBand(price),

                        peakCCU,

                        ownersLabel: ownersParsed.ownersLabel,
                        ownersMin: ownersParsed.ownersMin,
                        ownersMax: ownersParsed.ownersMax,
                        ownersMid: ownersParsed.ownersMid,

                        positive,
                        negative,
                        totalReviews,
                        posRatio,

                        genres: parseMaybeArray(getField(row, ["Genres", "genres"], "")),
                        tags: parseMaybeArray(getField(row, ["Tags", "tags"], "")),

                        requiredAge: toNumber(getField(row, ["Required age", "required_age"])),
                        discountDLCCount: toNumber(
                            getField(row, ["DiscountDLC count", "discountdlc_count"])
                        ),
                        metacriticScore: toNumber(
                            getField(row, ["Metacritic score", "metacritic_score"])
                        ),
                        userScore: toNumber(getField(row, ["User score", "user_score"])),
                        achievements: toNumber(getField(row, ["Achievements", "achievements"])),
                        recommendations: toNumber(
                            getField(row, ["Recommendations", "recommendations"])
                        ),
                        avgPlaytimeForever: toNumber(
                            getField(row, ["Average playtime forever", "average_playtime_forever"])
                        ),
                        avgPlaytimeTwoWeeks: toNumber(
                            getField(
                                row,
                                ["Average playtime two weeks", "average_playtime_two_weeks"]
                            )
                        ),
                        medianPlaytimeForever: toNumber(
                            getField(row, ["Median playtime forever", "median_playtime_forever"])
                        ),
                        medianPlaytimeTwoWeeks: toNumber(
                            getField(
                                row,
                                ["Median playtime two weeks", "median_playtime_two_weeks"]
                            )
                        ),

                        developers: getField(row, ["Developers", "developers"], ""),
                        publishers: getField(row, ["Publishers", "publishers"], ""),
                        categories: parseMaybeArray(
                            getField(row, ["Categories", "categories"], "")
                        ),

                        windows: parseBoolean(getField(row, ["Windows", "windows"], false)),
                        mac: parseBoolean(getField(row, ["Mac", "mac"], false)),
                        linux: parseBoolean(getField(row, ["Linux", "linux"], false)),

                        headerImage: getField(row, ["Header image", "header_image"], ""),
                        screenshots: parseMaybeArray(
                            getField(row, ["Screenshots", "screenshots"], "")
                        ),
                        movies: parseMaybeArray(getField(row, ["Movies", "movies"], "")),
                        website: getField(row, ["Website", "website"], ""),
                        supportUrl: getField(row, ["Support url", "support_url"], ""),
                        supportEmail: getField(row, ["Support email", "support_email"], ""),
                        reviewsText: getField(row, ["Reviews", "reviews"], ""),
                        about: getField(row, ["About the game", "about_the_game"], ""),
                        notes: getField(row, ["Notes", "notes"], ""),
                    }
                })

                console.log(
                    "Parsed first 10:",
                    data.slice(0, 10).map(d => ({
                        name: d.name,
                        positive: d.positive,
                        negative: d.negative,
                        totalReviews: d.totalReviews,
                        posRatio: d.posRatio,
                        posRatioPct: Number.isFinite(d.posRatio)
                            ? `${(d.posRatio * 100).toFixed(1)}%`
                            : "N/A",
                    }))
                )

                setRaw(data)
                setLoading(false)
            } catch (err) {
                if (cancelled) return
                console.error("useGamesData load error:", err)
                setError(err)
                setLoading(false)
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [])

    const dictionaries = useMemo(() => {
        const genreSet = new Set()
        const tagSet = new Set()

        let minYear = Infinity
        let maxYear = -Infinity

        for (const d of raw) {
            d.genres.forEach(g => genreSet.add(g))
            d.tags.forEach(t => tagSet.add(t))

            if (Number.isFinite(d.year)) {
                minYear = Math.min(minYear, d.year)
                maxYear = Math.max(maxYear, d.year)
            }
        }

        return {
            genres: Array.from(genreSet).sort((a, b) => a.localeCompare(b)),
            tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
            yearExtent: [
                Number.isFinite(minYear) ? minYear : 2000,
                Number.isFinite(maxYear) ? maxYear : new Date().getFullYear(),
            ],
        }
    }, [raw])

    return {
        raw,
        loading,
        error,
        dictionaries,
    }
}