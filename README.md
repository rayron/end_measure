end_measure

This is a minimal Expo app to measure the distance between a lawn bowls jack and the tee end using the camera.

Usage

1. Install dependencies: `npm install` or `expo install` for Expo SDK packages.
2. Start the dev server: `npm run dev`.
3. Open the app and tap "Measure Jack" to start the camera.
4. Use the "Set Ref" mode to tap two points on a known-length object placed in the scene (e.g. a 1 meter stick) and enter the real distance in meters.
5. (Optional but recommended) Use "Calibrate" mode to tap the four corners of a rectangular calibration object (top-left, top-right, bottom-right, bottom-left) and enter the real-world width+height in meters, then press "Compute Calib". This enables a homography and will give a more accurate planimetric measurement on the ground plane.
6. Switch to "Set Tee" and tap the tee end, then switch to "Set Jack" and tap the jack. The app will calculate and display the real-world distance.

Notes

- The measurement uses a pixel-to-meter scale; accuracy depends on keeping the reference object and the measured points on the same plane and holding the camera as level as possible.
- For more accurate world-space measurement, a device with depth/AR support and an AR-based approach would be required.

## Controls & Buttons

Below is a short reference describing what each UI control does in the app.

- `Measure Jack` (Home screen): opens the camera view where measurements are made.

On the Camera screen:

- `Set Tee`: change mode to "tee" — tapping the camera preview will place the tee end (green marker).
- `Set Jack`: change mode to "jack" — tapping the camera preview will place the jack (red marker).
- `Set Ref`: change mode to "reference" — the next two taps place the two reference points (yellow markers). These are used with the `Ref m` field to convert pixels into meters when homography is not set.
- `Calibrate`: change mode to "calibrate" — use this to tap four points (in the order top-left, top-right, bottom-right, bottom-left) of a rectangular calibration object. The `Calib w (m)` and `Calib h (m)` fields specify its real-world size.
- `Ref m` (input): numeric input for the known length (in meters) of the object you tapped in `Set Ref`. Required for pixel scaling when homography is not used.
- `Calib w (m)` / `Calib h (m)` (inputs): numeric inputs used for the width and height (meters) of the calibration rectangle used for homography.
- `Compute Calib`: computes a homography from the four calibration taps plus the `Calib w/h` inputs. When successful, measurements are computed using the planimetric homography for better accuracy.
- `Clear Calib`: clear the calibration points and homography (resets the calibration state).
- `Flip`: toggle between the front and back camera on the device.
- `Clear`: clear all points (tee/jack/reference/calibration points) and remove any applied homography.
- `Save`: checks that a valid reference (two points and ref distance) exists; then takes a camera snapshot and saves it to the device's photo library (requires Media Library permissions) and shows a confirmation with the distance.

- Auto-distance alert: once you set the `Tee` and then set the `Jack` point, the app will automatically compute the distance and show it as an alert (if a reference or calibration is available). If a conversion to meters is not possible, the alert will suggest setting a reference or calibration.

- Audio feedback: when a distance is calculated successfully, the app will speak the distance out loud using the device's TTS (text-to-speech) facilities when available.

Note: if the speech functionality doesn't work on your device, install the Expo TTS package:

```bash
expo install expo-speech
```

Tap behavior:

- Tapping the camera image places a point according to the current mode (`Set Tee`, `Set Jack`, `Set Ref`, `Calibrate`). When in `Calibrate` mode and 4 points are present, tapping starts a new calibration sequence producing a fresh list of four calibration points.

Status and output:

- The app shows the calculated distance (in meters and feet) under the controls. A small indicator displays whether the app is using a computed homography (`Calibrated`) or a pixel-to-meter scale (`Uncalibrated`).

Troubleshooting & EAS

- If you see the following error: `[expo-cli] --non-interactive is not supported, use $CI=1 instead`, that means a command used the deprecated `--non-interactive` flag. Expo wants you to set the `CI` environment variable instead.

- To run an EAS update non-interactively on macOS / Linux:

  ```bash
  CI=1 eas update
  ```

- For cross-platform usage, we've added a script you can run locally:

  ```bash
  npm run eas-update-ci
  ```

- Don't forget to login with `eas login` or set `EAS_TOKEN` in CI to authorize updates.
