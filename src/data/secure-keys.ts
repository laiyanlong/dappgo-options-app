import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Retrieve a key from secure storage (SecureStore on native, localStorage on web).
 */
export async function getSecureKey(key: string): Promise<string> {
    if (Platform.OS === 'web') {
        // SecureStore not available on web, use localStorage
        return localStorage.getItem(`dappgo_${key}`) ?? '';
    }
    return (await SecureStore.getItemAsync(key)) ?? '';
}

/**
 * Store a key in secure storage (SecureStore on native, localStorage on web).
 */
export async function setSecureKey(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(`dappgo_${key}`, value);
        return;
    }
    await SecureStore.setItemAsync(key, value);
}
