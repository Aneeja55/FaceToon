# FaceToon Lookalike Cam

FaceToon Lookalike Cam is a fun AI-powered web app that finds which cartoon character looks most like you. Upload or capture a photo, and our app matches it with the closest character using face recognition — all in your browser!

## Features
- Upload a photo or take one with your camera
- Finds the closest cartoon character from your static set
- All face processing is done in your browser (privacy-friendly)
- No images are uploaded to any server
- Modern, mobile-friendly UI (Next.js + Tailwind CSS)

## Demo
[**Live Demo on Vercel**](https://lookalike-1x0j396qx-aneeja55s-projects.vercel.app)

## Getting Started (Local)

1. **Clone the repo:**
   ```sh
   git clone https://github.com/Aneeja55/FaceToon.git
   cd lookalike-cam
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Download face-api.js models:**
   - Place the required models in `public/models/` (see [face-api.js model downloads](https://github.com/justadudewhohacks/face-api.js#models)).
4. **Add cartoon images:**
   - Place your cartoon images in `public/cartoon_characters/`.
5. **Run the app:**
   ```sh
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel
1. **Push your code to GitHub.**
2. **Go to [vercel.com](https://vercel.com/), sign up, and import your repo.**
3. **Deploy!** Vercel will auto-detect Next.js.
4. **After deploy:**
   - Make sure `public/models/` and `public/cartoon_characters/` are included in your repo.
   - If you add new images/models, push to GitHub and Vercel will redeploy.

## License
MIT License. See [LICENSE](./LICENSE).

---

**Made with ❤️ using Next.js, face-api.js, and Tailwind CSS.**
