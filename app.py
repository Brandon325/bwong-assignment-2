import numpy as np
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Generate random data points
def generate_random_data(n_points=300):
    X = np.random.randn(n_points, 2) * 5
    return X.tolist()

# Euclidean distance between points
def euclidean_distance(a, b):
    return np.linalg.norm(a - b)

# KMeans clustering algorithm
def kmeans(X, k, init='random', manual_centroids=None, max_iter=100):
    X = np.array(X)
    centroids = initialize_centroids(X, k, init, manual_centroids)

    all_centroids = [centroids.tolist()]
    all_labels = []

    for _ in range(max_iter):
        # Assign points to nearest centroid
        labels = assign_clusters(X, centroids)
        # Compute new centroids
        new_centroids = recompute_centroids(X, labels, k)

        all_labels.append(labels.tolist())
        all_centroids.append(new_centroids.tolist())

        # Check for convergence
        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids

    return all_centroids, all_labels

# Initialize centroids based on method
def initialize_centroids(X, k, method='random', manual_centroids=None):
    if method == 'random':
        indices = np.random.choice(X.shape[0], size=k, replace=False)
        return X[indices]
    elif method == 'farthest':
        return farthest_first_initialization(X, k)
    elif method == 'kmeans++':
        return kmeans_plus_plus_initialization(X, k)
    elif method == 'manual':
        if manual_centroids is None or len(manual_centroids) != k:
            raise ValueError("Manual centroids must be provided and match the number of clusters k.")
        return np.array(manual_centroids)
    else:
        raise ValueError("Unknown initialization method.")

# Farthest First Initialization
def farthest_first_initialization(X, k):
    centroids = [X[np.random.randint(0, X.shape[0])]]
    for _ in range(1, k):
        distances = np.array([min([euclidean_distance(x, c) for c in centroids]) for x in X])
        next_centroid = X[np.argmax(distances)]
        centroids.append(next_centroid)
    return np.array(centroids)

# KMeans++ Initialization
def kmeans_plus_plus_initialization(X, k):
    centroids = [X[np.random.randint(0, X.shape[0])]]
    for _ in range(1, k):
        distances = np.array([min([euclidean_distance(x, c) for c in centroids]) for x in X])
        probabilities = distances / distances.sum()
        next_centroid = X[np.random.choice(len(X), p=probabilities)]
        centroids.append(next_centroid)
    return np.array(centroids)

# Assign points to nearest centroids
def assign_clusters(X, centroids):
    return np.argmin(np.linalg.norm(X[:, np.newaxis] - centroids, axis=2), axis=1)

# Recompute centroids
def recompute_centroids(X, labels, k):
    new_centroids = []
    for i in range(k):
        points = X[labels == i]
        if len(points) == 0:
            # Reinitialize centroid to a random data point
            new_centroid = X[np.random.randint(0, X.shape[0])]
        else:
            new_centroid = points.mean(axis=0)
        new_centroids.append(new_centroid)
    return np.array(new_centroids)

# Route to generate random data
@app.route('/generate-data')
def generate_data():
    data = generate_random_data()
    return jsonify(data)

# Route to run KMeans clustering
@app.route('/run-kmeans', methods=['POST'])
def run_kmeans_route():
    try:
        data = request.json['data']
        k = int(request.json['k'])
        init_method = request.json['initMethod']
        manual_centroids = request.json.get('manualCentroids', None)

        if init_method == 'manual' and (manual_centroids is None or len(manual_centroids) != k):
            return jsonify({'error': 'Manual centroids are required for manual initialization and must match k.'}), 400

        centroids, labels = kmeans(data, k, init=init_method, manual_centroids=manual_centroids)
        return jsonify({
            'centroids': centroids,
            'labels': labels
        })

    except KeyError as e:
        return jsonify({'error': f'Missing parameter: {str(e)}'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'An error occurred during KMeans clustering.'}), 500

# Route for the index page
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
