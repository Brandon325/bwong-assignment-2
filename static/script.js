document.addEventListener('DOMContentLoaded', function () {
    const plotDiv = document.getElementById('plot');
    const generateButton = document.getElementById('generate-data');
    const runButton = document.getElementById('run-kmeans');
    const stepButton = document.getElementById('step-kmeans');
    const resetButton = document.getElementById('reset-kmeans');
    const numClustersInput = document.getElementById('num-clusters');
    const initMethodSelect = document.getElementById('init-method');

    let currentData = [];
    let currentIteration = 0;
    let allCentroids = [];
    let allLabels = [];
    let finalLabels = null;
    let isInitialized = false;
    let isRunning = false;
    let manualCentroids = [];
    let isManualMode = false;

    let clusterColors = [];

    // Function to generate dynamic colors
    function generateColors(numColors) {
        const colors = [];
        for (let i = 0; i < numColors; i++) {
            const hue = i * (360 / numColors);
            colors.push(`hsl(${hue}, 100%, 50%)`);
        }
        return colors;
    }

    // Function to display messages on the page
    function showMessage(message) {
        const messageArea = document.getElementById('message-area');
        messageArea.innerText = message;
    }

    // Function to plot data points and centroids
    function plotData(data, centroids = null, labels = null) {
        if (!data || data.length === 0) {
            console.error('No data available to plot.');
            return;
        }

        let k = parseInt(numClustersInput.value);
        if (!clusterColors || clusterColors.length !== k) {
            clusterColors = generateColors(k);
        }

        const trace = {
            x: data.map(point => point[0]),
            y: data.map(point => point[1]),
            mode: 'markers',
            type: 'scatter',
            marker: {
                color: labels ? labels.map(label => clusterColors[label % clusterColors.length]) : 'blue'
            }
        };

        let plotDataArray = [trace];

        // Add centroids if they exist
        if (centroids && centroids.length > 0) {
            const centroidTrace = {
                x: centroids.map(point => point[0]),
                y: centroids.map(point => point[1]),
                mode: 'markers',
                marker: {
                    color: 'black',
                    symbol: 'x',
                    size: 12,
                    line: {
                        width: 2,
                        color: 'black'
                    }
                },
                name: 'Centroids'
            };
            plotDataArray.push(centroidTrace);
        }

        // Define layout with clickmode set to event
        const layout = {
            title: 'KMeans Clustering Animation',
            clickmode: 'event',
            xaxis: {
                autorange: true
            },
            yaxis: {
                autorange: true
            }
        };

        Plotly.newPlot(plotDiv, plotDataArray, layout);

        if (isManualMode) {
            enableManualCentroidSelection(); // Ensure manual mode click handling is activated
        }
    }

    // Fetch new random data
    function fetchData() {
        fetch('/generate-data')
            .then(response => response.json())
            .then(data => {
                currentData = data;
                finalLabels = null;
                allCentroids = [];
                allLabels = [];
                manualCentroids = [];
                isInitialized = false;
                isManualMode = initMethodSelect.value === 'manual';
                plotData(data);
                showMessage('New dataset generated. Ready to run KMeans.');
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    // Initialize KMeans
    function initializeKMeans(callback) {
        const k = parseInt(numClustersInput.value);
        const initMethod = initMethodSelect.value;

        clusterColors = generateColors(k);

        let initData = {
            data: currentData,
            k: k,
            initMethod: initMethod
        };

        if (initMethod === 'manual' && manualCentroids.length === k) {
            initData.manualCentroids = manualCentroids;
        }

        fetch('/run-kmeans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                showMessage('Error: ' + result.error);
                enableButtons();
                return;
            }
            allCentroids = result.centroids;
            allLabels = result.labels;
            currentIteration = 0;
            isInitialized = true;
            if (callback) callback();
        })
        .catch(error => {
            console.error('Error initializing KMeans:', error);
            showMessage('Error initializing KMeans.');
            enableButtons();
        });
    }

    // Step through KMeans iterations
    function stepThroughKMeans() {
        disableButtons();
        if (!isInitialized) {
            initializeKMeans(function() {
                enableButtons();
                stepThroughKMeans();
            });
        } else if (currentIteration < allCentroids.length) {
            plotData(currentData, allCentroids[currentIteration], allLabels[currentIteration]);
            currentIteration++;
            enableButtons();
        } else {
            showMessage("KMeans has converged or reached max iterations.");
            finalLabels = allLabels[allLabels.length - 1];
            plotData(currentData, allCentroids[allCentroids.length - 1], finalLabels);
            enableButtons();
        }
    }

    // Run KMeans to convergence
    function runToConvergence() {
        disableButtons();
        if (!isInitialized) {
            initializeKMeans(function() {
                runToConvergence();
            });
        } else {
            isRunning = true;
            function step() {
                if (currentIteration < allCentroids.length) {
                    plotData(currentData, allCentroids[currentIteration], allLabels[currentIteration]);
                    currentIteration++;
                    setTimeout(step, 500);
                } else {
                    showMessage("KMeans has converged or reached max iterations.");
                    finalLabels = allLabels[allLabels.length - 1];
                    plotData(currentData, allCentroids[allCentroids.length - 1], finalLabels);
                    isRunning = false;
                    enableButtons();
                }
            }
            step();
        }
    }

    // Enable manual centroid selection on plot click
    function enableManualCentroidSelection() {
        plotDiv.removeAllListeners('plotly_click'); // Remove any existing listeners
        plotDiv.on('plotly_click', handlePlotClick); // Use Plotly's click event
    }

    function handlePlotClick(data) {
        if (manualCentroids.length < parseInt(numClustersInput.value)) {
            var xData = data.points[0].x;
            var yData = data.points[0].y;

            manualCentroids.push([xData, yData]);
            plotData(currentData, manualCentroids);

            if (manualCentroids.length === parseInt(numClustersInput.value)) {
                showMessage('All centroids selected! Now you can run KMeans.');
                plotDiv.removeAllListeners('plotly_click');
            } else {
                showMessage(`Selected centroid ${manualCentroids.length}/${numClustersInput.value}.`);
            }
        }
    }

    // Reset algorithm without changing the dataset
    resetButton.addEventListener('click', function () {
        currentIteration = 0;
        isRunning = false;
        isInitialized = false;
        manualCentroids = [];
        plotDiv.removeAllListeners('plotly_click'); // Remove Plotly click listeners

        // Re-detect if manual mode is active
        isManualMode = initMethodSelect.value === 'manual';

        // Re-plot the current data without any labels or centroids
        plotData(currentData);

        if (isManualMode) {
            showMessage('Algorithm reset. Manual mode activated! Click on the plot to select centroids.');
        } else {
            showMessage('Algorithm reset. Ready to run KMeans.');
        }

        enableButtons();
    });

    // Event listeners for buttons
    generateButton.addEventListener('click', function() {
        fetchData();
        enableButtons();
    });
    runButton.addEventListener('click', function() {
        runToConvergence();
    });
    stepButton.addEventListener('click', function() {
        stepThroughKMeans();
    });

    // Change listener for initialization method
    initMethodSelect.addEventListener('change', function () {
        isInitialized = false;
        manualCentroids = [];
        plotDiv.removeAllListeners('plotly_click'); // Remove Plotly click listeners
        if (initMethodSelect.value === 'manual') {
            isManualMode = true;
            showMessage('Manual mode activated! Click on the plot to select centroids.');
            plotData(currentData);
        } else {
            isManualMode = false;
            showMessage('Initialization method changed. Ready to run KMeans.');
            plotData(currentData);
        }
    });

    // Change listener for number of clusters
    numClustersInput.addEventListener('change', function () {
        isInitialized = false;
        manualCentroids = [];
        if (isManualMode) {
            showMessage('Number of clusters changed. Please reselect manual centroids.');
            plotData(currentData);
        } else {
            showMessage('Number of clusters changed. Ready to run KMeans.');
            plotData(currentData);
        }
    });

    // Function to disable buttons
    function disableButtons() {
        stepButton.disabled = true;
        runButton.disabled = true;
        resetButton.disabled = true;
        generateButton.disabled = true;
        numClustersInput.disabled = true;
        initMethodSelect.disabled = true;
    }

    // Function to enable buttons
    function enableButtons() {
        stepButton.disabled = false;
        runButton.disabled = false;
        resetButton.disabled = false;
        generateButton.disabled = false;
        numClustersInput.disabled = false;
        initMethodSelect.disabled = false;
    }

    // Initialize with random data
    fetchData();
});
