import { Route, Routes } from "react-router-dom";
import ReceptionWindow from "./windows/ReceptionWindow";

export default function App() {
  return (
    <Routes>
        <Route path="/" element={<ReceptionWindow />} />
    </Routes>
  );
}
