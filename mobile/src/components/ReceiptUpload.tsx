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

    try {
      const filename = `${Date.now()}.jpg`;
      const filePath = `receipts/${tabId}/${filename}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { data, error: fnError } = await supabase.functions.invoke(
        'parse-receipt',
        {
          body: { image_url: publicUrl },
        }
      );

      if (fnError) throw fnError;

      if (data?.items?.length) {
        onReceiptParsed(data as ReceiptResult);
      } else {
        Alert.alert('No items found', 'No items found in receipt. Try a clearer photo.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process receipt');
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
    borderColor: '#0dcaf0',
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
    color: '#0dcaf0',
    fontWeight: '600',
    fontSize: 15,
  },
});
