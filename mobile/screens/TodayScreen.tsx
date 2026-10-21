import { Button, SafeAreaView, ScrollView, Text } from "react-native";

export default function TodayScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView><Text>Записи на сегодня</Text><Button title="Обновить" onPress={() => {}} /></ScrollView>
    </SafeAreaView>
  );
}