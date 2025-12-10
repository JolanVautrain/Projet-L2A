from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)


def connectToDatabase():
    return psycopg2.connect(
        database="ma_db",
        user="mon_user",
        password="mon_pass",
        host="127.0.0.1",
        port="5432",
    )


conn = connectToDatabase()

cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS users;")

cur.execute(
    """CREATE TABLE IF NOT EXISTS users (
    username varchar(100) PRIMARY KEY, password varchar(100) NOT NULL);"""
)

cur.execute(
    """INSERT INTO users (username, password) VALUES
    ('test', '1234'),
    ('username', 'password'),
    ('azerty', 'qsdfgh');"""
)

conn.commit()

cur.close()
conn.close()


@app.route("/api/login")
def checkLogin2():
    return "Reached"


@app.route("/api/login", methods=["POST"])
def checkLogin():
    data = request.json
    username = data["username"]
    password = data["password"]
    userExist = False
    passwordIsCorrect = False

    conn = connectToDatabase()
    cur = conn.cursor()

    cur.execute("""SELECT * FROM users""")
    data = cur.fetchall()

    cur.close()
    conn.close()

    for user in data:
        if user[0] == username:
            userExist = True
            if user[1] == password:
                passwordIsCorrect = True

    return jsonify(
        {
            "userExist": userExist,
            "passwordIsCorrect": passwordIsCorrect,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
