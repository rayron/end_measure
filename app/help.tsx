import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';

export default function HelpScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Calibration Help</Text>

        <Text style={styles.sectionTitle}>What is calibration?</Text>
        <Text style={styles.text}>
          Calibration uses a known rectangular object to compute a homography (planimetric transform) between image coordinates and world coordinates. This improves distance accuracy when you want to measure distances in real-world units (meters).
        </Text>

        <Text style={styles.sectionTitle}>When to use calibration</Text>
        <Text style={styles.text}>Use calibration when you want more accurate (planimetric) measurements and can place a rectangular object of known size in the scene (for example, a box or calibration card).</Text>

        <Text style={styles.sectionTitle}>Step-by-step configuration</Text>
        <Text style={styles.text}>1. Switch to <Text style={styles.code}>Calibrate</Text> mode in the camera screen.</Text>
        <Text style={styles.text}>2. Tap the four corners of your rectangular calibration object in order: top-left, top-right, bottom-right, bottom-left.</Text>
        <Text style={styles.text}>3. Enter the object&apos;s real-world width and height in meters into the <Text style={styles.code}>Calib w (m)</Text> and <Text style={styles.code}>Calib h (m)</Text> fields.</Text>
        <Text style={styles.text}>4. Press <Text style={styles.code}>Compute Calib</Text>. If successful, the app will apply calibration and show <Text style={styles.code}>Calibrated</Text>.</Text>

        <Text style={styles.sectionTitle}>Tips & Troubleshooting</Text>
        <Text style={styles.text}>- Ensure the calibration object is flat and in the same plane as the points you plan to measure (e.g., both on the ground plane).</Text>
        <Text style={styles.text}>- Tap corner points in the correct sequence to avoid a failed homography solve.</Text>
        <Text style={styles.text}>- If calibration fails, make sure the object is not extremely foreshortened and fill enough of the camera frame for better precision.</Text>
        <Text style={styles.text}>- For best results, use a rectangular object with high contrast corners and avoid motion while tapping.</Text>

        <Text style={styles.sectionTitle}>Fallbacks</Text>
        <Text style={styles.text}>If you do not calibrate, you can still measure using a pixel-to-meter reference (Set Ref) or, on supported devices, an AR depth-based approach (if available in your device&apos;s SDK).</Text>

        <View style={styles.buttonsRow}>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/camera')}>
            <Text style={styles.btnText}>Open Camera</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push('/') }>
            <Text style={styles.btnText}>Return to Entry</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    color: '#fff',
  },
  text: {
    color: '#ddd',
    marginTop: 6,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    marginHorizontal: 0,
  },
  buttonsRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#005ccf',
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
