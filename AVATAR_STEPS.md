# Job Sarthi: 3D Avatar Interviewer System Setup Guide
## What you need to do and provide to complete the integration

This guide walks you through preparing your Blender 3D model, setting up API keys, and launching the new React Three Fiber frontend.

---

## 1. File Placement & Assets

To load the 3D avatar, you must place your GLB model file in the public assets directory.
- **Model Target Path**: `C:\Users\Lenova\Desktop\CAPABL_MATERIAL\Project_JobSarthi\seeker\react-avatar\public\assets\models\interviewer_avatar.glb`
*(Create the `public\assets\models\` directory structure if it is not already initialized).*

---

## 2. Model Requirements in Blender

For the avatar script to drive facial controls and play animations, the exported GLB model must follow these rigging and structural configurations:

### A. Skeleton Rig Bone Naming (Case-Insensitive)
Our JavaScript loaders perform object traversals checking for these naming substrings:
1. **Jaw Bone**: Name must contain `jaw` (e.g., `mixamorig:Jaw`, `JawBone`, `jaw`). This bone is rotated on the local **X-axis** in real time by the lip-sync volume intensity.
2. **Neck Bone**: Name must contain `neck` (e.g., `mixamorig:Neck`, `Neck`). Driven by minor breathing and nodding sway.
3. **Head Bone**: Name must contain `head` (e.g., `mixamorig:Head`, `Head`). Driven by slow gaze and drift sways.
4. **Left Eyelid**: Name must contain `eyelid_l` or `eyelidleft`.
5. **Right Eyelid**: Name must contain `eyelid_r` or `eyelidright`.

### B. Morph Targets (Shape Keys) for Eyelids (Recommended)
For high-fidelity eye blinking, define shape keys on your face mesh and name them:
*   `eyeBlinkLeft` or `eyeBlink_L` or `blink_L`
*   `eyeBlinkRight` or `eyeBlink_R` or `blink_R`
*(Our code automatically detects these morph targets. If they are missing, it falls back to rotating the eyelid bones on the X-axis).*

### C. Blender Animation Tracks (NLA Clips)
Export your animations inside the GLB file. They must be named:
1. **`idle`**: A looping sequence of slight breathing sways.
2. **`speaking_body`**: A looping sequence of gentle hand gesturing and conversational posture shifts.
3. **`listening_posture`**: A looping sequence representing an attentive listening pose.

---

## 3. What to Provide in the UI Setup Screen

When you open the setup page of the mock interview, you can configure these items:

1. **ElevenLabs API Key**: Paste your secret ElevenLabs key to enable real-time human-like speech synthesis.
   - *If left blank, the platform automatically falls back to browser-native `speechSynthesis` voices.*
2. **ElevenLabs Voice ID**: (Optional) Enter the specific Voice ID you wish to use (defaults to Rachel: `21m00Tcm4TlvDq8ikWAM`).

---

## 4. Running the Application

To run the React avatar app locally:

1. Open a terminal inside the subfolder:
   ```powershell
   cd C:\Users\Lenova\Desktop\CAPABL_MATERIAL\Project_JobSarthi\seeker\react-avatar
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
4. Access the avatar frontend at **`http://localhost:5173`**. The Vite server automatically routes backend database and evaluation requests to your main Express port (3000) using a proxy configuration.
