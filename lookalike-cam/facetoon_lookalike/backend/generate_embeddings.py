# generate_embeddings.py
import face_recognition
import json
import os

cartoon_dir = "cartoon_images/"
cartoons = []

for file in os.listdir(cartoon_dir):
    if not file.endswith(".jpg") and not file.endswith(".png"):
        continue

    path = os.path.join(cartoon_dir, file)
    img = face_recognition.load_image_file(path)
    encodings = face_recognition.face_encodings(img)
    if encodings:
        cartoons.append({
            "name": os.path.splitext(file)[0],
            "image_url": f"https://yourcdn.com/cartoon/{file}",
            "embedding": encodings[0].tolist()
        })

with open("cartoon_embeddings.json", "w") as f:
    json.dump(cartoons, f)
