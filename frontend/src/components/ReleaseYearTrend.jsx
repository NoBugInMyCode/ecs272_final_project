import { useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"

export default function ReleaseYearTrend({ data, metric }) {
    const ref = useRef(null)

    const yearlyData = useMemo(() => {
        const valid = data
            .map(d => {
                const value = metric === "owners" ? d.ownersMid : d.peakCCU
                return {
                    year: d.year,
                    value,
                }
            })
            .filter(d => Number.isFinite(d.year) && Number.isFinite(d.value) && d.value > 0)

        const grouped = d3.rollups(
            valid,
            values => ({
                avg: d3.mean(values, d => d.value),
                count: values.length,
            }),
            d => d.year
        )
            .map(([year, stats]) => ({
                year,
                avg: stats.avg,
                count: stats.count,
            }))
            .sort((a, b) => a.year - b.year)

        return grouped
    }, [data, metric])

    useEffect(() => {
        const host = ref.current
        if (!host) return

        const width = host.clientWidth || 700
        const height = host.clientHeight || 360
        const margin = { top: 30, right: 20, bottom: 50, left: 70 }
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
            .text("Release Year Trend")

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

        if (yearlyData.length === 0) {
            g.append("text")
                .attr("x", innerW / 2)
                .attr("y", innerH / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#666")
                .style("font-size", "14px")
                .text("No yearly trend data available")
            return
        }

        const x = d3.scaleLinear()
            .domain(d3.extent(yearlyData, d => d.year))
            .range([0, innerW])

        const yMax = d3.max(yearlyData, d => d.avg) ?? 1

        const y = d3.scaleLinear()
            .domain([0, yMax])
            .nice()
            .range([innerH, 0])

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")))

        g.append("g")
            .call(d3.axisLeft(y).ticks(6, "~s"))

        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text("Release Year")

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text(metric === "owners" ? "Average Estimated Owners" : "Average Peak CCU")

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.avg))
            .curve(d3.curveMonotoneX)

        g.append("path")
            .datum(yearlyData)
            .attr("fill", "none")
            .attr("stroke", "#4682b4")
            .attr("stroke-width", 2)
            .attr("d", line)

        g.append("g")
            .selectAll("circle")
            .data(yearlyData)
            .join("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.avg))
            .attr("r", 4)
            .attr("fill", "#4682b4")
            .on("mouseenter", (event, d) => {
                tooltip
                    .style("display", "block")
                    .html(`
                        <div style="font-weight:600; margin-bottom:4px;">${d.year}</div>
                        <div>Average ${metric === "owners" ? "Estimated Owners" : "Peak CCU"}: ${formatSI(d.avg)}</div>
                        <div>Games: ${d.count.toLocaleString()}</div>
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
    }, [yearlyData, metric])

    return (
        <div
            ref={ref}
            style={{
                position: "relative",
                width: "100%",
                height: "360px",
                border: "1px solid #ddd",
                borderRadius: 12,
            }}
        />
    )
}

function formatSI(x) {
    return d3.format("~s")(x)
}