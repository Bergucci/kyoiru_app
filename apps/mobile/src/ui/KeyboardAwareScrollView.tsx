import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface Props extends ScrollViewProps {
  outerStyle?: StyleProp<ViewStyle>;
}

export function KeyboardAwareScrollView({ outerStyle, style, contentContainerStyle, children, ...rest }: Props) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, outerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={[styles.flex, style]}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
