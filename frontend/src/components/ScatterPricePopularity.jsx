import { useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"

export default function ScatterPricePopularity({ data, metric }) {
    const ref = useRef(null)

    const points = useMemo(() => {
        return data
            .map(d => {
                const y = getMetricValue(d, metric)
                return { ...d, _y: y }
            })
            .filter(d => Number.isFinite(d.price) && Number.isFinite(d._y))
            .filter(d => {
                if (metric === "posRatio") {
                    return d._y >= 0 && d._y <= 1
                }
                return d._y > 0
            })
    }, [data, metric])

    useEffect(() => {
        const host = ref.current
        if (!host) return

        const width = host.clientWidth || 900
        const height = host.clientHeight || 520
        const margin = { top: 30, right: 18, bottom: 48, left: 70 }
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
            .text("Price vs Popularity")

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

        if (points.length === 0) {
            g.append("text")
                .attr("x", innerW / 2)
                .attr("y", innerH / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#666")
                .style("font-size", "14px")
                .text("No data available for current filters")
            return
        }

        const xExtent = d3.extent(points, d => d.price)
        const x = d3.scaleLinear()
            .domain([Math.min(0, xExtent[0] ?? 0), xExtent[1] ?? 60])
            .nice()
            .range([0, innerW])

        const yMin = d3.min(points, d => d._y) ?? 0
        const yMax = d3.max(points, d => d._y) ?? 1

        const useLogScale = metric !== "posRatio"

        const y = useLogScale
            ? d3.scaleLog()
                .domain([Math.max(1, yMin), Math.max(10, yMax)])
                .nice()
                .range([innerH, 0])
            : d3.scaleLinear()
                .domain([0, yMax])
                .nice()
                .range([innerH, 0])

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x))

        g.append("g")
            .call(
                metric === "posRatio"
                    ? d3.axisLeft(y).tickFormat(d => `${Math.round(d * 100)}%`)
                    : d3.axisLeft(y).ticks(6, "~s")
            )

        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text("Price (USD)")

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text(useLogScale ? `${metricLabel(metric)} (log)` : metricLabel(metric))

        g.append("g")
            .selectAll("circle")
            .data(points)
            .join("circle")
            .attr("cx", d => x(d.price))
            .attr("cy", d => y(d._y))
            .attr("r", 2.5)
            .attr("fill", "#4682b4")
            .attr("opacity", 0.6)
            .on("mouseenter", (event, d) => {
                tooltip
                    .style("display", "block")
                    .html(`
                        <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(d.name || "Unknown")}</div>
                        <div>Price: ${Number.isFinite(d.price) ? `$${d.price.toFixed(2)}` : "N/A"}</div>
                        <div>${metricLabel(metric)}: ${formatMetricValue(d._y, metric)}</div>
                        <div>Total reviews: ${Number.isFinite(d.totalReviews) ? formatSI(d.totalReviews) : "N/A"}</div>
                        <div>Positive ratio: ${Number.isFinite(d.posRatio) ? `${(d.posRatio * 100).toFixed(1)}%` : "N/A"}</div>
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

    }, [points, metric])

    return (
        <div
            ref={ref}
            style={{
                position: "relative",
                width: "100%",
                height: "520px",
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
            return "Avg Playtime"
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

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
