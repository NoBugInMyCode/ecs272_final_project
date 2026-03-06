import { useMemo, useState } from "react"

const ALL_BANDS = ["Free", "0-10", "10-30", "30-60", "60+"]

export default function ControlsPanel({
                                          dictionaries,
                                          metric, setMetric,
                                          selectedPriceBands, setSelectedPriceBands,
                                          selectedGenres, setSelectedGenres,
                                          selectedTags, setSelectedTags,
                                          minReviews, setMinReviews,
                                          yearRange, setYearRange
                                      }) {
    const [tagQuery, setTagQuery] = useState("")
    const [genreQuery, setGenreQuery] = useState("")

    const filteredTags = useMemo(() => {
        const q = tagQuery.trim().toLowerCase()
        if (!q) return dictionaries.tags.slice(0, 50)
        return dictionaries.tags.filter(t => t.toLowerCase().includes(q)).slice(0, 50)
    }, [dictionaries.tags, tagQuery])

    const filteredGenres = useMemo(() => {
        const q = genreQuery.trim().toLowerCase()
        if (!q) return dictionaries.genres.slice(0, 50)
        return dictionaries.genres.filter(g => g.toLowerCase().includes(q)).slice(0, 50)
    }, [dictionaries.genres, genreQuery])

    function toggleSetItem(setter, setObj, item) {
        const next = new Set(setObj)
        if (next.has(item)) next.delete(item)
        else next.add(item)
        setter(next)
    }

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, height: "fit-content" }}>
            <h3 style={{ marginTop: 0 }}>Filters</h3>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Popularity metric</div>
                <label style={{ display: "block" }}>
                    <input type="radio" checked={metric === "owners"} onChange={() => setMetric("owners")} />
                    {" "}Estimated owners
                </label>
                <label style={{ display: "block" }}>
                    <input type="radio" checked={metric === "peakCCU"} onChange={() => setMetric("peakCCU")} />
                    {" "}Peak CCU
                </label>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Price bands</div>
                {ALL_BANDS.map(b => (
                    <label key={b} style={{ display: "block" }}>
                        <input
                            type="checkbox"
                            checked={selectedPriceBands.has(b)}
                            onChange={() => toggleSetItem(setSelectedPriceBands, selectedPriceBands, b)}
                        />
                        {" "}{b}
                    </label>
                ))}
                <button
                    style={{ marginTop: 6 }}
                    onClick={() => setSelectedPriceBands(new Set(ALL_BANDS))}
                >
                    Select all
                </button>
                <button
                    style={{ marginLeft: 8, marginTop: 6 }}
                    onClick={() => setSelectedPriceBands(new Set())}
                >
                    Clear
                </button>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Min total reviews</div>
                <input
                    type="number"
                    value={minReviews}
                    min={0}
                    step={10}
                    onChange={e => setMinReviews(Number(e.target.value))}
                    style={{ width: "100%" }}
                />
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Year range</div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        type="number"
                        value={yearRange[0]}
                        onChange={e => setYearRange([Number(e.target.value), yearRange[1]])}
                        style={{ width: "50%" }}
                    />
                    <input
                        type="number"
                        value={yearRange[1]}
                        onChange={e => setYearRange([yearRange[0], Number(e.target.value)])}
                        style={{ width: "50%" }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Genres (multi-select)</div>
                <input
                    placeholder="Search genre..."
                    value={genreQuery}
                    onChange={e => setGenreQuery(e.target.value)}
                    style={{ width: "100%", marginBottom: 6 }}
                />
                <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #eee", padding: 6, borderRadius: 8 }}>
                    {filteredGenres.map(g => (
                        <label key={g} style={{ display: "block" }}>
                            <input
                                type="checkbox"
                                checked={selectedGenres.has(g)}
                                onChange={() => toggleSetItem(setSelectedGenres, selectedGenres, g)}
                            />
                            {" "}{g}
                        </label>
                    ))}
                </div>
                <button style={{ marginTop: 6 }} onClick={() => setSelectedGenres(new Set())}>Clear genres</button>
            </div>

            <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Tags / Themes (multi-select)</div>
                <input
                    placeholder="Search tag..."
                    value={tagQuery}
                    onChange={e => setTagQuery(e.target.value)}
                    style={{ width: "100%", marginBottom: 6 }}
                />
                <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #eee", padding: 6, borderRadius: 8 }}>
                    {filteredTags.map(t => (
                        <label key={t} style={{ display: "block" }}>
                            <input
                                type="checkbox"
                                checked={selectedTags.has(t)}
                                onChange={() => toggleSetItem(setSelectedTags, selectedTags, t)}
                            />
                            {" "}{t}
                        </label>
                    ))}
                </div>
                <button style={{ marginTop: 6 }} onClick={() => setSelectedTags(new Set())}>Clear tags</button>
            </div>
        </div>
    )
}