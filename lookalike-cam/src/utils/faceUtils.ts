import * as faceapi from 'face-api.js';

export const loadModels = async () => {
  // Optionally remove the first three lines; they're redundant
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models/ssd_mobilenetv1'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models/face_recognition'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models/face_landmark_68')
  ]);
};

export const getFaceEmbedding = async (image: HTMLImageElement): Promise<Float32Array | null> => {
  const detection = await faceapi
    .detectSingleFace(image)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return detection.descriptor;
};
