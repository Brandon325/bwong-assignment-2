install:
	pip install -r requirements.txt

run:
	FLASK_APP=app.py FLASK_ENV=development flask run