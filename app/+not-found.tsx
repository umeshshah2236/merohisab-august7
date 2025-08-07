import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View, Platform } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        title: "Oops!",
        // CRITICAL: Android background to prevent white flash during navigation
        contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
      }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
