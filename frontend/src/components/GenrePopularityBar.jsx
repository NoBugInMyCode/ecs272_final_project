import { useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"

export default function GenrePopularityBar({ data, metric }) {
    const ref = useRef(null)

    const genreData = useMemo(() => {
        const expanded = data.flatMap(d => {
            const value = getMetricValue(d, metric)

            if (!Array.isArray(d.genres) || d.genres.length === 0) return []
            if (!Number.isFinite(value)) return []

            if (metric === "posRatio") {
                if (value < 0 || value > 1) return []
            } else {
                if (value <= 0) return []
            }

            return d.genres.map(genre => ({
                genre,
                value,
            }))
        })

        const grouped = d3.rollups(
            expanded,
            values => ({
                avg: d3.mean(values, d => d.value),
                count: values.length,
            }),
            d => d.genre
        )
            .map(([genre, stats]) => ({
                genre,
                avg: stats.avg,
                count: stats.count,
            }))
            .filter(d => Number.isFinite(d.avg))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 12)

        return grouped
    }, [data, metric])

    useEffect(() => {
        const host = ref.current
        if (!host) return

        const width = host.clientWidth || 700
        const height = host.clientHeight || 420
        const margin = { top: 30, right: 20, bottom: 40, left: 140 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const svg = d3
            .select(host)
            .selectAll("svg")
            .data([null])
            .join("svg")
            .attr("width", width)
            .attr("height", height)

        svg.selectAll("*").remove()

        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)

        svg.append("text")
            .attr("x", 12)
            .attr("y", 20)
            .attr("font-size", 14)
            .attr("font-weight", 600)
            .text("Genre Popularity")

        const tooltip = d3
            .select(host)
            .selectAll(".tooltip")
            .data([null])
            .join("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(255,255,255,0.95)")
            .style("border", "1px solid #ddd")
            .style("border-radius", "8px")
            .style("padding", "8px")
            .style("font-size", "12px")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
            .style("display", "none")

        if (genreData.length === 0) {
            g.append("text")
                .attr("x", innerW / 2)
                .attr("y", innerH / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#666")
                .style("font-size", "14px")
                .text("No genre data available")
            return
        }

        const y = d3.scaleBand()
            .domain(genreData.map(d => d.genre))
            .range([0, innerH])
            .padding(0.2)

        const xMax = d3.max(genreData, d => d.avg) ?? 1
        const x = d3.scaleLinear()
            .domain([0, xMax])
            .nice()
            .range([0, innerW])

        g.append("g")
            .call(d3.axisLeft(y))

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                metric === "posRatio"
                    ? d3.axisBottom(x).tickFormat(d => `${Math.round(d * 100)}%`)
                    : d3.axisBottom(x).ticks(6, "~s")
            )

        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 34)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text(`Average ${metricLabel(metric)}`)

        g.append("g")
            .selectAll("rect")
            .data(genreData)
            .join("rect")
            .attr("x", 0)
            .attr("y", d => y(d.genre))
            .attr("width", d => x(d.avg))
            .attr("height", y.bandwidth())
            .attr("fill", "#4682b4")
            .attr("opacity", 0.85)
            .on("mouseenter", (event, d) => {
                tooltip
                    .style("display", "block")
                    .html(`
                        <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(d.genre)}</div>
                        <div>Average ${metricLabel(metric)}: ${formatMetricValue(d.avg, metric)}</div>
                        <div>Games counted: ${d.count.toLocaleString()}</div>
                    `)
            })
            .on("mousemove", (event) => {
                const rect = host.getBoundingClientRect()
                tooltip
                    .style("left", `${event.clientX - rect.left + 12}px`)
                    .style("top", `${event.clientY - rect.top + 12}px`)
            })
            .on("mouseleave", () => {
                tooltip.style("display", "none")
            })

    }, [genreData, metric])

    return (
        <div
            ref={ref}
            style={{
                position: "relative",
                width: "100%",
                height: "420px",
                border: "1px solid #ddd",
                borderRadius: 12,
            }}
        />
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

    return d3.format("~s")(x)
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
