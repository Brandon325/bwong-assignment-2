install:
	python3 -m venv venv
	. venv/bin/activate && pip install --upgrade pip
	. venv/bin/activate && pip install -r requirements.txt

# Run the Flask app
run:
	. venv/bin/activate && FLASK_APP=app.py FLASK_ENV=development flask run --host=0.0.0.0 --port=3000