import React, { Component } from "react";
import "./Visual.css";
import * as d3 from "d3";

class Visual extends Component {
	constructor(props) {
    super(props);
    this.state = {
      category: "Sentiment",
			selectedTweets: [],
    };
    this.simulation = null;
    this.initialized = false;
  }

	handleCategoryChange = (event) => {
    const category = event.target.value;
    this.setState({ category }, () => {
      this.updateCategoryColors();
      d3.select('.legend').remove();
      this.renderLegend(category, this.getColorScale(category));
    });
  };

  componentDidUpdate(prevProps, prevState) {
    // create visual only when data is uploaded
    if (!this.initialized && this.props.csv_data.length > 0) {
      this.renderVisual();
      this.initialized = true;
    }

    // update category colors when state changes
    if (prevState.category !== this.state.category) {
      this.updateCategoryColors();
      this.renderLegend();
    }
  }

  getColorScale = (category) => {
    const sentimentColorScale = d3.scaleLinear()
      .domain([-1, 0, 1])
      .range(["red", "#ECECEC", "green"]);
    
    const subjectivityColorScale = d3.scaleLinear()
      .domain([0, 1])
      .range(["#ECECEC", "#4467C4"]);

    return category === "Sentiment" ? sentimentColorScale : subjectivityColorScale;
  }

  updateCategoryColors = () => {
    const data = this.props.csv_data;

    const sentimentColorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["red", "#ECECEC", "green"]);
    const subjectivityColorScale = d3.scaleLinear().domain([0, 1]).range(["#ECECEC", "#4467C4"]);

    d3.select(".forceLayout")
      .select("g")
      .selectAll("circle")
      .data(data)
      .attr("fill", (d) =>
        this.state.category === "Sentiment"
          ? sentimentColorScale(d.Sentiment)
          : subjectivityColorScale(d.Subjectivity)
      );
  }

  renderLegend = (category, colorScale) => {
    d3.selectAll('.legend').remove();
    const svg = d3.select('.forceLayout').select('g');
    const height = 600;
    const legendWidth = 20;
    const legendHeight = 300;

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendWidth + 600}, ${height/2 - legendHeight/2})`);

    // create gradient
    const gradient = legend.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('gradientTransform', 'rotate(90)');

    if (category === "Sentiment") {
      gradient.selectAll('stop')
        .data([
          { offset: "0%", color: "green" },
          { offset: "50%", color: "#ECECEC" },
          { offset: "100%", color: "red" }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    } else {
      gradient.selectAll('stop')
        .data([
          { offset: "0%", color: "#4467C4" },
          { offset: "100%", color: "#ECECEC" }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    }

    // add rectangle with gradient
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');

    // add labels
    const labels = (category === "Sentiment" ? ["Positive", "Negative"] : ["Subjective", "Objective"]);

    legend.selectAll('.legend-label')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'legend-label')
      .attr('x', legendWidth + 5)
      .attr('y', (d, i) => i * legendHeight)
      .attr('dy', (d, i) => i === 0 ? '1em' : '-0.5em')
      .attr('text-anchor', 'start')
      .text(d => d);
  }

  renderVisual = () => {
    // get data
    const data = this.props.csv_data;
  
    // set dimensions and margins
    const margin = { top: 125, right: 40, bottom: 125, left: 40 };
    const width = 800;
    const height = 600;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // create svg container
    const svg = d3.select(".forceLayout")
      .attr("width", width)
      .attr("height", height)
      .select("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // define positions for clusters based on month
    const monthClusters = {
      March: { x: innerWidth / 2, y: innerHeight / 4 },
      April: { x: innerWidth / 2, y: innerHeight / 2 },
      May: { x: innerWidth / 2, y: 3 * (innerHeight / 4) },
    };

    // add month labels
    const verticalSpacing = 150;
    const yOffset = -50;

    svg.selectAll(".month-label")
      .data(Object.keys(monthClusters))
      .join("text")
      .attr("class", "month-label")
      .attr("x", -margin.left + 10)
      .attr("y", (d, i) => i * verticalSpacing + margin.top + yOffset)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text((d) => d);

    // define color scales
    const sentimentColorScale = d3.scaleLinear().domain([-1, 0, 1]).range(["red", "#ECECEC", "green"]);
    const subjectivityColorScale = d3.scaleLinear().domain([0, 1]).range(["#ECECEC", "#4467C4"]);
  
    // get current category
    const colorScale = (this.state.category === "Sentiment" ? sentimentColorScale : subjectivityColorScale);
  
    // create force simulation
    this.simulation = d3.forceSimulation(data)
      .force('charge', d3.forceManyBody().strength(-2))
      .force('x', d3.forceX((d) => monthClusters[d.Month]?.x || width / 2).strength(0.1))
      .force('y', d3.forceY((d) => monthClusters[d.Month]?.y || height / 2).strength(0.1))
      .force("collision", d3.forceCollide(4))
      .on("tick", ticked);
  
    // add nodes for each tweet
    const nodes = svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("r", 4)
      .attr("fill", (d) =>
        this.state.category === "Sentiment"
          ? sentimentColorScale(d.Sentiment)
          : subjectivityColorScale(d.Subjectivity)
      )
      .on('click', (event, d) => this.handleTweetClick(event, d));
  
    // update circle positions
    function ticked() {
      nodes
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
    }
    
    // legend
    this.renderLegend(this.state.category, colorScale);
  }

  handleTweetClick = (event, d) => {
    this.setState(prevState => {
      let newSelectedTweets = [...prevState.selectedTweets];
      const tweetIndex = newSelectedTweets.findIndex(tweet => tweet.idx === d.idx);
  
      if (tweetIndex > -1) {
        newSelectedTweets.splice(tweetIndex, 1);
        d3.select(event.target)
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
      } else {
        newSelectedTweets.unshift(d);
        d3.select(event.target)
          .attr('stroke', 'black')
          .attr('stroke-width', 2);
      }
  
      // console.log("Selected Tweets:", newSelectedTweets);
      return { selectedTweets: newSelectedTweets };
    });
  }

  render() {
    // Check if data is loaded
    const isDataLoaded = this.props.csv_data.length > 0;
  
    return (
      <div>
        {/* Only show dropdown if data is loaded */}
        {isDataLoaded && (
          <div className="dropdown">
            <label>Color By&nbsp;:</label>
            <select 
              value={this.state.category}
              onChange={this.handleCategoryChange}
            >
              <option value="Sentiment">Sentiment</option>
              <option value="Subjectivity">Subjectivity</option>
            </select>
          </div>
        )}
  
        {/* Main Visual */}
        <svg className='forceLayout'><g></g></svg>
  
        {/* Selected Tweets */}
        <div className="tweets">
          {this.state.selectedTweets.map((tweet, index) => (
            <div key={tweet.idx} className="tweet">
              <p>{tweet.RawTweet}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default Visual;