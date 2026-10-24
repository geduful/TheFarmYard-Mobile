import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TheFarmYard</Text>
      <Text style={styles.subtitle}>
        Tabs are rendering correctly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#666666',
  },
});