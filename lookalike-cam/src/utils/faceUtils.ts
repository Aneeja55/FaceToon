import * as faceapi from 'face-api.js';

export const loadModels = async (api: typeof faceapi) => {
  const MODEL_URL = '/models';
  await Promise.all([
    api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
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
