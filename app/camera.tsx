import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Dimensions, TextInput, Alert, ScrollView } from 'react-native';
import { Camera as CameraApi, CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import Svg, { Circle, Line, Text as TextSVG } from 'react-native-svg';
import { Stack, useRouter } from 'expo-router';

const window = Dimensions.get('window');

type Point = { x: number; y: number };

function pixelDistance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function CameraMeasure() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.width, height: window.height });

  // points
  const [teePoint, setTeePoint] = useState<Point | null>(null);
  const [jackPoint, setJackPoint] = useState<Point | null>(null);
  const [refA, setRefA] = useState<Point | null>(null);
  const [refB, setRefB] = useState<Point | null>(null);
  const [calibPoints, setCalibPoints] = useState<Point[]>([]);
  const [calibWidth, setCalibWidth] = useState<string>('1.0');
  const [calibHeight, setCalibHeight] = useState<string>('0.1');
  const [homography, setHomography] = useState<number[] | null>(null);

  const [mode, setMode] = useState<'tee' | 'jack' | 'reference' | 'calibrate' | 'none'>('tee');
  const [referenceDistance, setReferenceDistance] = useState<string>('1.0'); // in meters

  useEffect(() => {
    (async () => {
      const { status } = await CameraApi.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) return <View />;
  if (hasPermission === false)
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );

  

  const onTap = (evt: any) => {
    // evt.nativeEvent holds locationX, locationY relative to target
    const { locationX, locationY } = evt.nativeEvent;
    const p = { x: locationX, y: locationY };

    if (mode === 'tee') setTeePoint(p);
    else if (mode === 'jack') {
      setJackPoint(p);
      // if tee exists, compute the distance immediately and show it
      if (teePoint) {
        const meters = computeMetersBetween(teePoint, p);
        if (meters) {
          Alert.alert('Distance', `${meters.toFixed(2)} m (${(meters * 3.28084).toFixed(2)} ft)`);
        } else {
          Alert.alert('Distance', 'Unable to compute distance – ensure a reference is set or perform calibration.');
        }
      }
    }
    else if (mode === 'reference') {
      if (!refA) setRefA(p);
      else setRefB(p);
    } else if (mode === 'calibrate') {
      setCalibPoints((prev) => {
        if (prev.length >= 4) return [p];
        return [...prev, p];
      });
    }
  };

  const clear = () => {
    setTeePoint(null);
    setJackPoint(null);
    setRefA(null);
    setRefB(null);
    setCalibPoints([]);
    setHomography(null);
  };

  const computeMetersBetween = (aPt: Point | null, bPt: Point | null) => {
    if (!aPt || !bPt) return null;
    // prefer homography if available
    if (homography) {
      const a = applyHomography(homography, aPt);
      const b = applyHomography(homography, bPt);
      const meters = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
      return meters;
    }
    const pxDist = pixelDistance(aPt, bPt);
    if (refA && refB && Number(referenceDistance) > 0) {
      const refPx = pixelDistance(refA, refB);
      const metersPerPixel = Number(referenceDistance) / refPx;
      const meters = pxDist * metersPerPixel;
      return meters; // in meters
    }
    return null;
  };

  const measureDistance = () => computeMetersBetween(teePoint, jackPoint);

  const formattedDistance = () => {
    const meters = measureDistance();
    if (!meters) return '—';
    return `${meters.toFixed(2)} m (${(meters * 3.28084).toFixed(2)} ft)`;
  };

  const handleLayout = (evt: any) => {
    setDimensions({ width: evt.nativeEvent.layout.width, height: evt.nativeEvent.layout.height });
  };

  // homography helpers (minimal, assumes 4 points)
  function solveLinearSystem(A: number[][], b: number[]) {
    const n = A.length;
    if (n !== b.length || A[0].length !== n) return null;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let k = 0; k < n; k++) {
      let iMax = k;
      let maxVal = Math.abs(M[k][k]);
      for (let i = k + 1; i < n; i++) {
        const val = Math.abs(M[i][k]);
        if (val > maxVal) {
          maxVal = val;
          iMax = i;
        }
      }
      if (maxVal < 1e-12) return null;
      if (iMax !== k) {
        const tmp = M[k];
        M[k] = M[iMax];
        M[iMax] = tmp;
      }
      const pivot = M[k][k];
      for (let j = k; j <= n; j++) M[k][j] /= pivot;
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        const f = M[i][k];
        for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    const x: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) x[i] = M[i][n];
    return x;
  }

  function computeHomography(imagePts: Point[], worldPts: Point[]) {
    if (imagePts.length !== 4 || worldPts.length !== 4) return null;
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 4; i++) {
      const { x, y } = imagePts[i];
      const X = worldPts[i].x;
      const Y = worldPts[i].y;
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
      b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
      b.push(Y);
    }
    const h = solveLinearSystem(A, b);
    if (!h) return null;
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }

  function applyHomography(H: number[], p: Point) {
    const x = p.x;
    const y = p.y;
    const w = H[6] * x + H[7] * y + H[8];
    return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w };
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView style={styles.camera} facing={cameraType as any} ref={(c: any) => (cameraRef.current = c)}>
        <Pressable style={styles.touchLayer} onPressIn={onTap}>
          <Svg height={dimensions.height} width={dimensions.width}>
            {/* draw points */}
            {teePoint && <Circle cx={teePoint.x} cy={teePoint.y} r={8} fill="#00ff00" stroke="#fff" strokeWidth={2} />}
            {jackPoint && <Circle cx={jackPoint.x} cy={jackPoint.y} r={8} fill="#ff0000" stroke="#fff" strokeWidth={2} />}
            {refA && <Circle cx={refA.x} cy={refA.y} r={6} fill="#ffff00" stroke="#000" strokeWidth={1} />}
            {refB && <Circle cx={refB.x} cy={refB.y} r={6} fill="#ffff00" stroke="#000" strokeWidth={1} />}

            {teePoint && jackPoint && (
              <Line x1={teePoint.x} y1={teePoint.y} x2={jackPoint.x} y2={jackPoint.y} stroke="#00ff00" strokeWidth={3} opacity={0.9} />
            )}
            {refA && refB && <Line x1={refA.x} y1={refA.y} x2={refB.x} y2={refB.y} stroke="#ffff00" strokeWidth={3} opacity={0.9} />}
            {calibPoints.map((pt, idx) => (
              <React.Fragment key={`cp-${idx}`}>
                <Circle cx={pt.x} cy={pt.y} r={6} fill="#00ffff" stroke="#000" strokeWidth={1} />
                <TextSVG x={pt.x + 10} y={pt.y + 5} fontSize="12" fill="#fff">{(idx + 1).toString()}</TextSVG>
              </React.Fragment>
            ))}
          </Svg>
        </Pressable>
      </CameraView>

      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
         <TouchableOpacity style={[styles.modeBtn, mode === 'calibrate' && styles.modeBtnActive]} onPress={() => setMode('calibrate')}>
            <Text style={styles.modeText}>Calibrate</Text>
          </TouchableOpacity>
             <TouchableOpacity
            style={[styles.modeBtn, { marginLeft: 8 }]}
            onPress={async () => {
              if (calibPoints.length < 4) {
                Alert.alert('Calibrate', 'Tap 4 corners in order of the rectangular object');
                return;
              }
              const w = Number(calibWidth);
              const h = Number(calibHeight);
              if (!w || !h) {
                Alert.alert('Calibrate', 'Enter valid calibration width and height in meters');
                return;
              }
              const world = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
              const H = computeHomography(calibPoints, world);
              if (!H) {
                Alert.alert('Calibrate', 'Failed to compute homography');
                return;
              }
              setHomography(H);
              Alert.alert('Calibrate', 'Calibration applied');
            }}
          >
            <Text style={styles.modeText}>Save</Text>
          </TouchableOpacity>
        
          <TouchableOpacity style={[styles.modeBtn, mode === 'tee' && styles.modeBtnActive]} onPress={() => setMode('tee')}>
            <Text style={styles.modeText}>Set Tee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'jack' && styles.modeBtnActive]} onPress={() => setMode('jack')}>
            <Text style={styles.modeText}>Set Jack</Text>
          </TouchableOpacity>
             <TouchableOpacity onPress={clear} style={[styles.iconBtn, { marginLeft: 8 }]}>
            <Text style={{ color: '#fff' }}>Clear</Text>
          </TouchableOpacity>
                 <TouchableOpacity style={[styles.modeBtn, { marginLeft: 8 }]} onPress={() => router.push('/help')}>
            <Text style={styles.modeText}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.modeBtn, mode === 'reference' && styles.modeBtnActive]} onPress={() => setMode('reference')}>
            <Text style={styles.modeText}>Set Ref</Text>
          </TouchableOpacity>
         
          <TextInput
            placeholder="Ref m"
            keyboardType="numeric"
            value={referenceDistance}
            onChangeText={setReferenceDistance}
            style={[styles.input, { marginLeft: 8 }]}
          />
          <TextInput
            placeholder="Calib w (m)"
            keyboardType="numeric"
            value={calibWidth}
            onChangeText={setCalibWidth}
            style={[styles.input, { marginLeft: 8 }]}
          />
          <TextInput
            placeholder="Calib h (m)"
            keyboardType="numeric"
            value={calibHeight}
            onChangeText={setCalibHeight}
            style={[styles.input, { marginLeft: 8 }]}
          />
          <TouchableOpacity onPress={() => setCameraType((t) => (t === 'back' ? 'front' : 'back'))} style={[styles.iconBtn, { marginLeft: 8 }]}>
            <Text style={{ color: '#fff' }}>Flip</Text>
          </TouchableOpacity>
       
       
          <TouchableOpacity style={[styles.modeBtn, { marginLeft: 8 }]} onPress={() => { setHomography(null); setCalibPoints([]); }}>
            <Text style={styles.modeText}>Clear Calib</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, { marginLeft: 8 }]} onPress={async () => {
            if (!refA || !refB || Number(referenceDistance) <= 0) {
              Alert.alert('Reference missing', 'You must set both reference points to compute distance and input a valid reference distance in meters.');
              return;
            }
            // optional: take snapshot and save
            try {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission denied', 'Media library permission is required to save a snapshot.');
                return;
              }
              const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
              if (photo && photo.uri) {
                await MediaLibrary.saveToLibraryAsync(photo.uri);
                Alert.alert('Saved', `Snapshot saved (${formattedDistance()})`);
              }
            } catch (err) {
              console.warn(err);
            }
          }}>
            <Text style={styles.modeText}>Save</Text>
          </TouchableOpacity>
     
        </ScrollView>
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Distance: {formattedDistance()}</Text>
          <Text style={{ color: homography ? '#0f0' : '#ff0' }}>{homography ? 'Calibrated' : 'Uncalibrated'}</Text>
        </View>
        <Text style={styles.helper}>Tap on the camera image to mark points for the current mode. Use Calibrate mode to tap four corners of a rectangle and compute homography for improved measurements.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  touchLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginRight: 8,
  },
  modeBtnActive: {
    backgroundColor: '#005ccf',
  },
  modeText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 8,
    color: '#fff',
    minWidth: 50,
  },
  helper: {
    marginTop: 10,
    color: '#ddd',
    fontSize: 12,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#333',
    marginLeft: 8,
    borderRadius: 8,
  },
  controlsRow: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
