import { useMemo, useState } from "react"
import { useGamesData } from "./hooks/useGamesData"
import ControlsPanel from "./components/ControlsPanel"
import ScatterPricePopularity from "./components/ScatterPricePopularity"
import GameTable from "./components/GameTable"

export default function App() {
    const { raw, loading, error, dictionaries } = useGamesData()

    const [metric, setMetric] = useState("owners")
    const [selectedPriceBands, setSelectedPriceBands] = useState(new Set(["Free", "0-10", "10-30", "30-60", "60+"]))
    const [selectedGenres, setSelectedGenres] = useState(new Set())
    const [selectedTags, setSelectedTags] = useState(new Set())
    const [minReviews, setMinReviews] = useState(0)
    const [yearRange, setYearRange] = useState([dictionaries.yearExtent[0], dictionaries.yearExtent[1]])

    const filtered = useMemo(() => {
        const [y0, y1] = yearRange
        return raw.filter(d => {
            if (!selectedPriceBands.has(d.priceBand)) return false
            if (Number.isFinite(d.totalReviews) && d.totalReviews < minReviews) return false

            if (Number.isFinite(d.year)) {
                if (d.year < y0 || d.year > y1) return false
            }

            if (selectedGenres.size > 0) {
                const ok = d.genres.some(g => selectedGenres.has(g))
                if (!ok) return false
            }
            if (selectedTags.size > 0) {
                const ok = d.tags.some(t => selectedTags.has(t))
                if (!ok) return false
            }
            return true
        })
    }, [raw, selectedPriceBands, selectedGenres, selectedTags, minReviews, yearRange])

    if (loading) return <div style={{ padding: 16 }}>Loading games.csv...</div>
    if (error) return <div style={{ padding: 16 }}>Failed to load CSV: {String(error)}</div>

    console.log("raw length:", raw.length)
    console.log("filtered length:", filtered.length)
    console.log("sample raw row:", raw[0])

    return (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, padding: 16 }}>
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

            <div style={{ display: "grid", gridTemplateRows: "520px 1fr", gap: 16 }}>
                <ScatterPricePopularity data={filtered} metric={metric} />
                <GameTable data={filtered} metric={metric} />
            </div>
        </div>
    )
}