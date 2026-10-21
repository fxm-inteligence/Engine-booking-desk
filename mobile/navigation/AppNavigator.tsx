import TodayScreen from "../screens/TodayScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

/** Main Navigation: one screen per route. */
export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="/" component={TodayScreen} />
    </Stack.Navigator>
  );
}
