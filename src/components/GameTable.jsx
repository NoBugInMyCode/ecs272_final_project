import { useMemo } from "react"
import * as d3 from "d3";
export default function GameTable({ data, metric }) {
    const top = useMemo(() => {
        const key = metric === "owners" ? "owners" : "peakCCU"
        return [...data]
            .filter(d => Number.isFinite(d[key]))
            .sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity))
            .slice(0, 20)
    }, [data, metric])

    const keyLabel = metric === "owners" ? "Owners" : "Peak CCU"

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Top 20 (current filters) — {data.length.toLocaleString()} games
            </div>
            <div style={{ maxHeight: 320, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr>
                        <th style={th}>Name</th>
                        <th style={th}>Price</th>
                        <th style={th}>{keyLabel}</th>
                        <th style={th}>Pos%</th>
                        <th style={th}>Reviews</th>
                        <th style={th}>Year</th>
                    </tr>
                    </thead>
                    <tbody>
                    {top.map(d => {
                        const val = metric === "owners" ? d.owner : d.peakCCU
                        return (
                            <tr key={d.id}>
                                <td style={td}>{d.name}</td>
                                <td style={td}>${Number.isFinite(d.price) ? d.price.toFixed(2) : "N/A"}</td>
                                <td style={td}>{Number.isFinite(val) ? d3.format("~s")(val) : "N/A"}</td>
                                <td style={td}>{Number.isFinite(d.posRatio) ? `${(d.posRatio * 100).toFixed(1)}%` : "N/A"}</td>
                                <td style={td}>{Number.isFinite(d.totalReviews) ? d3.format("~s")(d.totalReviews) : "N/A"}</td>
                                <td style={td}>{Number.isFinite(d.year) ? d.year : "N/A"}</td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px", position: "sticky", top: 0, background: "#fff" }
const td = { borderBottom: "1px solid #f3f3f3", padding: "6px 4px", fontSize: 12 }