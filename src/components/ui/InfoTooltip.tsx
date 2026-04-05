import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useTheme } from '../../theme';

interface InfoTooltipProps {
  /** Short help text (under 10 words) */
  text: string;
}

/**
 * Small info icon that shows a tooltip popup on tap.
 * Auto-dismisses after 3 seconds or on tap outside.
 */
export function InfoTooltip({ text }: InfoTooltipProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    // Auto-dismiss after 3s
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 3000);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={show}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Text style={[styles.icon, { color: colors.textMuted }]}>{'\u24D8'}</Text>
      </TouchableOpacity>

      {visible && (
        <Modal transparent animationType="none" visible={visible} onRequestClose={dismiss}>
          <Pressable style={styles.overlay} onPress={dismiss}>
            <Animated.View
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity,
                },
              ]}
            >
              <Text style={[styles.tooltipText, { color: colors.text }]}>{text}</Text>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  icon: {
    fontSize: 12,
    marginLeft: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tooltip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
