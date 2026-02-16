import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabaseClient';

interface ParsedItem {
  description: string;
  price: number;
}

export interface ReceiptResult {
  items: ParsedItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface ReceiptUploadProps {
  tabId: string;
  onReceiptParsed: (result: ReceiptResult) => void;
}

export default function ReceiptUpload({ tabId, onReceiptParsed }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setUploading(true);
    let step = 'reading file';

    try {
      const filename = `${Date.now()}.jpg`;
      const filePath = `receipts/${tabId}/${filename}`;

      // Use FormData with file URI — the only reliable upload method on React Native
      step = 'uploading to storage';
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      const session = (await supabase.auth.getSession()).data.session;
      const uploadRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/receipts/${filePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`Upload failed (${uploadRes.status}): ${errBody}`);
      }

      step = 'getting public URL';
      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      step = `calling edge function`;
      const { data, error: fnError } = await supabase.functions.invoke(
        'parse-receipt',
        {
          body: { image_url: publicUrl },
        }
      );

      if (fnError) {
        const detail = typeof data === 'object' ? JSON.stringify(data) : String(data ?? '');
        throw new Error(`${fnError.message}${detail ? `\n\n${detail}` : ''}`);
      }

      if (data?.items?.length) {
        onReceiptParsed(data as ReceiptResult);
      } else {
        Alert.alert('No items found', 'No items found in receipt. Try a clearer photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', `Failed at: ${step}\n\n${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePress = () => {
    Alert.alert('Scan Receipt', 'Choose image source', [
      { text: 'Camera', onPress: pickImage },
      { text: 'Photo Library', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0dcaf0" />
            <Text style={styles.buttonText}> Scanning receipt...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Scan Receipt</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    borderWidth: 1.5,
    borderColor: '#00ff00',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#00ff00',
    fontWeight: '600',
    fontSize: 15,
  },
});
