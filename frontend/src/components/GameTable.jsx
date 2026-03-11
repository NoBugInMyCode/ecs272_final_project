import { useMemo } from "react"
import * as d3 from "d3"

export default function GameTable({ data, metric }) {
    const keyLabel = metricLabel(metric)

    const top = useMemo(() => {
        console.log(
            "GameTable incoming sample:",
            data.slice(0, 10).map(d => ({
                name: d.name,
                posRatio: d.posRatio,
                posRatioPct:
                    Number.isFinite(d.posRatio)
                        ? `${(d.posRatio * 100).toFixed(1)}%`
                        : "N/A",
                totalReviews: d.totalReviews,
                positive: d.positive,
                negative: d.negative,
                sortValue: getMetricValue(d, metric),
            }))
        )

        return [...data]
            .filter(d => {
                const value = getMetricValue(d, metric)
                if (!Number.isFinite(value)) return false

                if (metric === "posRatio") {
                    return value >= 0 && value <= 1
                }

                return value > 0
            })
            .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric))
            .slice(0, 20)
    }, [data, metric])

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Top 20 (current filters) — {data.length.toLocaleString()} games
            </div>

            <div style={{ maxHeight: 320, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Price</th>
                        <th style={thStyle}>{keyLabel}</th>
                        <th style={thStyle}>Pos%</th>
                        <th style={thStyle}>Reviews</th>
                        <th style={thStyle}>Year</th>
                    </tr>
                    </thead>

                    <tbody>
                    {top.map(d => {
                        const value = getMetricValue(d, metric)

                        return (
                            <tr key={d.id}>
                                <td style={tdStyle}>{d.name || "Unknown"}</td>

                                <td style={tdStyle}>
                                    {Number.isFinite(d.price)
                                        ? `$${d.price.toFixed(2)}`
                                        : "N/A"}
                                </td>

                                <td style={tdStyle}>
                                    {formatMetricValue(value, metric)}
                                </td>

                                <td style={tdStyle}>
                                    {Number.isFinite(d.posRatio)
                                        ? `${(d.posRatio * 100).toFixed(1)}%`
                                        : "N/A"}
                                </td>

                                <td style={tdStyle}>
                                    {Number.isFinite(d.totalReviews)
                                        ? formatSI(d.totalReviews)
                                        : "N/A"}
                                </td>

                                <td style={tdStyle}>
                                    {Number.isFinite(d.year) ? d.year : "N/A"}
                                </td>
                            </tr>
                        )
                    })}

                    {top.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                style={{
                                    ...tdStyle,
                                    textAlign: "center",
                                    color: "#666",
                                }}
                            >
                                No rows available for current filters
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function getMetricValue(d, metric) {
    switch (metric) {
        case "owners":
            return d.ownersMid
        case "peakCCU":
            return d.peakCCU
        case "posRatio":
            return d.posRatio
        case "totalReviews":
            return d.totalReviews
        case "recommendations":
            return d.recommendations
        case "avgPlaytimeForever":
            return d.avgPlaytimeForever
        default:
            return d.ownersMid
    }
}

function metricLabel(metric) {
    switch (metric) {
        case "owners":
            return "Estimated Owners"
        case "peakCCU":
            return "Peak CCU"
        case "posRatio":
            return "Positive Review %"
        case "totalReviews":
            return "Total Reviews"
        case "recommendations":
            return "Recommendations"
        case "avgPlaytimeForever":
            return "Avg Playtime Forever"
        default:
            return "Value"
    }
}

function formatMetricValue(x, metric) {
    if (!Number.isFinite(x)) return "N/A"

    if (metric === "posRatio") {
        return `${(x * 100).toFixed(1)}%`
    }

    return formatSI(x)
}

function formatSI(x) {
    return d3.format("~s")(x)
}

const thStyle = {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #ddd",
    background: "#fafafa",
    position: "sticky",
    top: 0,
    zIndex: 1,
    fontSize: 13,
}

const tdStyle = {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "1px solid #eee",
    fontSize: 13,
}
