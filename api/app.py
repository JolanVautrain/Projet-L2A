from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

users = {
    "test":"1234",
    "test2":"1",
}


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

    if username in users :
        userExist = True
        
        if users.get(username) == password:
            passwordIsCorrect = True
    return jsonify(
        {
            "userExist": userExist,
            "passwordIsCorrect": passwordIsCorrect,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
