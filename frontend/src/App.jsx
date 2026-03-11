import { useEffect, useMemo, useState } from "react"
import { useGamesData } from "./hooks/useGamesData"
import ControlsPanel from "./components/ControlsPanel"
import ScatterPricePopularity from "./components/ScatterPricePopularity"
import ReleaseYearTrend from "./components/ReleaseYearTrend"
import GenrePopularityBar from "./components/GenrePopularityBar"
import GameTable from "./components/GameTable"

export default function App() {
    const { raw, loading, error, dictionaries } = useGamesData()

    const [metric, setMetric] = useState("owners")
    const [selectedPriceBands, setSelectedPriceBands] = useState(
        new Set(["Free", "0-10", "10-30", "30-60", "60+"])
    )
    const [selectedGenres, setSelectedGenres] = useState(new Set())
    const [selectedTags, setSelectedTags] = useState(new Set())
    const [minReviews, setMinReviews] = useState(0)
    const [yearRange, setYearRange] = useState([2000, 2026])

    useEffect(() => {
        setYearRange(dictionaries.yearExtent)
    }, [dictionaries.yearExtent])

    const filtered = useMemo(() => {
        const [y0, y1] = yearRange

        return raw.filter(d => {
            if (!selectedPriceBands.has(d.priceBand)) return false
            if (Number.isFinite(d.totalReviews) && d.totalReviews < minReviews) return false

            if (Number.isFinite(d.year)) {
                if (d.year < y0 || d.year > y1) return false
            }

            if (selectedGenres.size > 0 && !d.genres.some(g => selectedGenres.has(g))) return false
            if (selectedTags.size > 0 && !d.tags.some(t => selectedTags.has(t))) return false

            return true
        })
    }, [raw, selectedPriceBands, selectedGenres, selectedTags, minReviews, yearRange])

    if (loading) return <div style={{ padding: 16 }}>Loading games.csv...</div>
    if (error) return <div style={{ padding: 16 }}>Failed to load CSV: {String(error)}</div>

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "320px 1fr",
                gap: 16,
                padding: 16,
                alignItems: "start",
            }}
        >
            <ControlsPanel
                dictionaries={dictionaries}
                metric={metric}
                setMetric={setMetric}
                selectedPriceBands={selectedPriceBands}
                setSelectedPriceBands={setSelectedPriceBands}
                selectedGenres={selectedGenres}
                setSelectedGenres={setSelectedGenres}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
                minReviews={minReviews}
                setMinReviews={setMinReviews}
                yearRange={yearRange}
                setYearRange={setYearRange}
            />

            <div
                style={{
                    display: "grid",
                    gridTemplateRows: "520px 360px 420px 1fr",
                    gap: 16,
                }}
            >
                <ScatterPricePopularity data={filtered} metric={metric} />
                <ReleaseYearTrend data={filtered} metric={metric} />
                <GenrePopularityBar data={filtered} metric={metric} />
                <GameTable data={filtered} metric={metric} />
            </div>
        </div>
    )
}
