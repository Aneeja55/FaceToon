from flask import Flask, request, jsonify
import face_recognition
import numpy as np
import json
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load cartoon face embeddings
with open("cartoon_embeddings.json", "r") as f:
    cartoon_data = json.load(f)

@app.route("/match", methods=["POST"])
def match_face():
    if "image" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["image"]
    img = face_recognition.load_image_file(file)
    try:
        user_encoding = face_recognition.face_encodings(img)[0]
    except IndexError:
        return jsonify({"error": "No face found in image"}), 400

    # Compare with cartoon embeddings
    best_match = None
    highest_similarity = -1

    for cartoon in cartoon_data:
        cartoon_encoding = np.array(cartoon["embedding"])
        similarity = np.dot(user_encoding, cartoon_encoding) / (
            np.linalg.norm(user_encoding) * np.linalg.norm(cartoon_encoding)
        )

        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match = cartoon

    return jsonify({
        "name": best_match["name"],
        "image_url": best_match["image_url"],
        "similarity": highest_similarity
    })

if __name__ == "__main__":
    app.run(debug=True)
