import { useEffect, useMemo, useState } from "react"
import * as d3 from "d3";
import { parseYear, splitList, priceBand } from "../utils/parse"

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
        ownersMin: min,
        ownersMax: max,
        ownersMid: Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : NaN,
    }
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
                const rows = await d3.csv("/games.csv")
                console.log("rows[0]:", rows[0])
                console.log("columns:", rows.columns)

                if (cancelled) return

                const data = rows.map((row, index) => {
                    const price = Number(row["Price"])
                    const positive = Number(row["Positive"])
                    const negative = Number(row["Negative"])
                    const peakCCU = Number(row["Peak CCU"])
                    const year = parseYear(row["Release date"])
                    const totalReviews = positive + negative
                    const posRatio = totalReviews > 0 ? positive / totalReviews : NaN

                    const ownersParsed = parseOwnersRange(row["Estimated owners"])

                    return {
                        id: row["AppID"] || String(index),
                        name: row["Name"],
                        releaseDate: row["Release date"],
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

                        genres: splitList(row["Genres"]),
                        tags: splitList(row["Tags"]),

                        // 如果你后面还想用这些字段，也顺手保留
                        requiredAge: Number(row["Required age"]),
                        discountDLCCount: Number(row["DiscountDLC count"]),
                        metacriticScore: Number(row["Metacritic score"]),
                        userScore: Number(row["User score"]),
                        achievements: Number(row["Achievements"]),
                        recommendations: Number(row["Recommendations"]),
                        avgPlaytimeForever: Number(row["Average playtime forever"]),
                        avgPlaytimeTwoWeeks: Number(row["Average playtime two weeks"]),
                        medianPlaytimeForever: Number(row["Median playtime forever"]),
                        medianPlaytimeTwoWeeks: Number(row["Median playtime two weeks"]),

                        developers: row["Developers"],
                        publishers: row["Publishers"],
                        categories: splitList(row["Categories"]),

                        windows: row["Windows"] === "True",
                        mac: row["Mac"] === "True",
                        linux: row["Linux"] === "True",

                        headerImage: row["Header image"],
                        screenshots: splitList(row["Screenshots"]),
                        movies: splitList(row["Movies"]),
                        website: row["Website"],
                        supportUrl: row["Support url"],
                        supportEmail: row["Support email"],
                        reviewsText: row["Reviews"],
                        about: row["About the game"],
                        notes: row["Notes"],
                    }
                })

                setRaw(data)
                setLoading(false)
            } catch (err) {
                if (cancelled) return
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