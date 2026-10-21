import { useEffect } from "react";
import { applyPageSeo } from "./lib/page-seo";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MastersPage from "./pages/MastersPage";
import ClientsPage from "./pages/ClientsPage";
import BookingsPage from "./pages/BookingsPage";

/** Writes a Page's title and meta tags into the document head when its route opens. */
function SeoOnOpen({ apply }: { apply: () => void }) {
  useEffect(apply, [apply]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><SeoOnOpen apply={() => applyPageSeo({ title: "Services" })} /><HomePage /></>} />
        <Route path="/masters" element={<><SeoOnOpen apply={() => applyPageSeo({ title: "Masters" })} /><MastersPage /></>} />
        <Route path="/clients" element={<><SeoOnOpen apply={() => applyPageSeo({ title: "Clients" })} /><ClientsPage /></>} />
        <Route path="/bookings" element={<><SeoOnOpen apply={() => applyPageSeo({ title: "Bookings" })} /><BookingsPage /></>} />
      </Routes>
    </BrowserRouter>
  );
}
