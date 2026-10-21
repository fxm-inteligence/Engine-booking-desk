import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./navigation/AppNavigator";
import { appTheme } from "./theme";

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: appTheme.colors.surface }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}
