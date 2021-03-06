import { useWindowWidth } from "@react-hook/window-size/throttled";
import * as d3 from "d3";
import { legendColor } from "d3-svg-legend";
import React, { useEffect, useRef, useState } from "react";
import * as topojson from "topojson";
import { lang } from "../constants";

function Map({ districts, summary, maxActive, hotspots }) {
  const [district, setDistrict] = useState({});
  const [renderData, setRenderData] = useState(null);
  const [curLang, setCurLang] = useState([]);
  const [mapHeight, setMapHeight] = useState(0);
  const [legendPos, setLegendPos] = useState(0);
  const width = useWindowWidth(450, { fps: 30, leading: true, wait: 0 });
  const map = useRef(null);

  useEffect(() => {
    if (renderData) {
      d3.selectAll("svg#chart > *").remove();
      const svg = d3.select(map.current);
      const topology = topojson.feature(
        renderData,
        renderData.objects.kerala_district
      );
      const projection = d3.geoMercator();
      projection.fitHeight(mapHeight, topology);
      const path = d3.geoPath(projection);
      const maxInterpolation = 0.8;
      const color = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, maxActive / maxInterpolation]);
      svg
        .append("g")
        .attr("class", "kerala")
        .selectAll("path")
        .data(topology.features)
        .enter()
        .append("path")
        .attr("fill", function(d) {
          const n = districts.summary[d.properties.district].active;
          return n === 0
            ? "#ffffff"
            : d3.interpolateReds((maxInterpolation * n) / maxActive);
        })
        .attr("d", path)
        .attr("pointer-events", "all")
        .on("mouseenter", (d) => {
          if (districts.summary[d.properties.district]) {
            const current = d.properties.district;
            setDistrict({
              name: current,
              ...districts.summary[current],
              delta: districts.delta[current],
            });
          }
          const target = d3.event.target;
          d3.select(target.parentNode.appendChild(target))
            .attr("stroke", "#ff073a")
            .attr("stroke-width", 2);
        })
        .on("mouseleave", (d) => {
          setDistrict({
            name: "All Districts",
            ...summary.summary,
            delta: summary.delta,
          });
          const target = d3.event.target;
          d3.select(target).attr("stroke", "None");
        })
        .style("cursor", "pointer")
        .append("title")
        .text(function(d) {
          return `${parseFloat(
            100 *
              (parseInt(districts.summary[d.properties.district].active) /
                summary.summary.active)
          ).toFixed(2)}% from ${d.properties.district}`;
        });
      svg
        .append("path")
        .attr("stroke", "#ff073a20")
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr(
          "d",
          path(topojson.mesh(renderData, renderData.objects.kerala_district))
        );
      svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(5,${legendPos})`);
      const numCells = 6;
      const delta = Math.floor(
        (maxActive < numCells ? numCells : maxActive) / (numCells - 1)
      );
      const cells = Array.from(Array(numCells).keys()).map((i) => i * delta);
      function label({ i, genLength, generatedLabels }) {
        if (i === genLength - 1) {
          const n = Math.floor(generatedLabels[i]);
          return `${n}+`;
        } else {
          const n1 = 1 + Math.floor(generatedLabels[i]);
          const n2 = Math.floor(generatedLabels[i + 1]);
          return `${n1} - ${n2}`;
        }
      }
      const legend = legendColor()
        .shapeWidth(30)
        .cells(cells)
        .titleWidth(3)
        .labels(label)
        .title("Active Cases")
        .orient("vertical")
        .scale(color);
      svg.select(".legend").call(legend);
    }
  }, [
    districts.delta,
    districts.summary,
    legendPos,
    mapHeight,
    maxActive,
    renderData,
    summary.delta,
    summary.summary,
  ]);

  useEffect(() => {
    if (
      Object.keys(districts.summary).length > 0 &&
      map.current &&
      summary.summary.active
    ) {
      (async () => {
        setDistrict({
          name: "All Districts",
          ...summary.summary,
          delta: summary.delta,
        });
        const kerala = await d3.json("/kerala.json");
        setRenderData(kerala);
      })();
    }
  }, [districts.summary, summary.delta, summary.summary]);

  useEffect(() => {
    if (width >= 1600) {
      setCurLang(Object.keys(lang).slice(1));
      setMapHeight(610);
      setLegendPos(440);
    } else if (width >= 1280) {
      setCurLang(Object.keys(lang).slice(1));
      setMapHeight(610);
      setLegendPos(480);
    } else if (width >= 500) {
      setCurLang(Object.keys(lang).slice(1));
      setMapHeight(545);
      setLegendPos(415);
    } else if (width > 370) {
      setCurLang(
        Object.keys(lang)
          .reverse()
          .slice(0, 8)
      );
      setMapHeight(450);
      setLegendPos(325);
    } else {
      setCurLang(Object.keys(lang).slice(1, 5));
      setMapHeight(450);
      setLegendPos(325);
    }
  }, [width]);

  return (
    <div className="relative flex flex-col min-w-full min-h-full p-4 rounded-lg bg-fiord-800 avg2:mb-0">
      <svg
        className="z-0 min-w-full min-h-full text-mobile avg2:text-base"
        id="chart"
        height={mapHeight}
        ref={map}
      ></svg>
      <div
        className={
          "z-40 flex flex-grow flex-col absolute top-0 right-0 text-right text-mobile avg2:text-base min-h-full items-end"
        }
        style={{ pointerEvents: "none" }}
      >
        <div className="px-1 py-1 m-2 font-semibold rounded-md sm:px-2 bg-gradient-r-fiord-700">
          <p className="text-sm avg2:text-xl">{district.name}</p>
        </div>
        {curLang.map((k, i) => {
          return (
            <div
              key={i}
              className="px-1 py-1 mx-2 my-1 rounded-md sm:my-1 sm:px-2 bg-gradient-r-fiord-700 max-w-none"
            >
              <p>{lang[k]}</p>
              <div className="font-medium">
                {district[k]}
                <p className="inline ml-1 text-mobilexs avg2:text-mobile text-fiord-400 ">
                  {district.delta[k] > 0
                    ? `+${district.delta[k]}`
                    : district.delta[k] === 0
                    ? "-"
                    : district.delta[k]}
                </p>
              </div>
            </div>
          );
        })}
        <div className="px-1 py-1 mx-2 my-1 rounded-md sm:my-1 sm:px-2 bg-gradient-r-fiord-700 max-w-none">
          <p>Containment Zones</p>
          <div className="font-medium capitalize">
            {district.name === "All Districts"
              ? Object.values(hotspots).reduce((p, c) => p + c.length, 0)
              : hotspots[district.name]?.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Map;
