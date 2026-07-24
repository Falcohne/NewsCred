import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useTheme, displayFont } from '../context/ThemeContext';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

/**
 * App-wide alert, styled to the design system:
 * cancel = quiet outline · default = teal · destructive = red.
 */
const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, buttons, onClose }) => {
  const { colors } = useTheme();
  const s = styles(colors);
  const btns = buttons && buttons.length ? buttons : [{ text: 'OK' }];

  const press = (b: AlertButton) => {
    onClose();
    if (b.onPress) setTimeout(b.onPress, 120);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <View style={[s.btnRow, btns.length > 2 && { flexDirection: 'column' }]}>
            {btns.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDestructive = b.style === 'destructive';
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => press(b)}
                  style={[
                    s.btn,
                    btns.length > 2 && { marginHorizontal: 0, marginTop: i === 0 ? 0 : 8 },
                    isCancel && s.btnCancel,
                    isDestructive && { backgroundColor: colors.bad },
                    !isCancel && !isDestructive && { backgroundColor: colors.teal },
                  ]}
                >
                  <Text style={[
                    s.btnText,
                    isCancel ? { color: colors.inkMuted } : { color: isDestructive ? '#FFFFFF' : colors.onTeal },
                  ]}>
                    {b.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = (c: any) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 20, padding: 22,
  },
  title: { ...displayFont, fontSize: 18, color: c.ink, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 13.5, color: c.inkMuted, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  btnRow: { flexDirection: 'row', justifyContent: 'center' },
  btn: {
    flex: 1, borderRadius: 24, paddingVertical: 11,
    alignItems: 'center', marginHorizontal: 5,
  },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  btnText: { fontSize: 14, fontWeight: '700' },
});

export default CustomAlert;
