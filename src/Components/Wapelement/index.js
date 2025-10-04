import React, { useEffect, useState, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Replace with your Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;


export default function Wapelement({ vin, start, end, applyFilter }) {
  
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!vin || !start || !end) return;

    async function fetchData() {
      setLoading(true);
      try {
        const url = `https://ble.nerdherdlab.com/loctionfetch.php?vin=${vin}&start=${encodeURIComponent(
          start
        )}&end=${encodeURIComponent(end)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.status === "success" && json.data.length > 0) {
          const route = json.data
            .map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
            .filter((p) => p.lat && p.lng);
          setPoints(route);
        } else {
          setPoints([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setPoints([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [vin, start, end, applyFilter]);

  const center = points.length > 0 ? points[0] : { lat: 0, lng: 0 };

  if (!isLoaded) return <div>Loading Google Maps...</div>;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      {loading && <div className="text-white p-4">Loading route...</div>}

      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
        {points.length > 0 && (
          <>
            {/* Start Marker */}
            <Marker position={points[0]} label="Start" />
            {/* End Marker */}
            <Marker position={points[points.length - 1]} label="End" />
            {/* Route Polyline */}
            <Polyline
              path={points}
              options={{
                strokeColor: "#0000FF",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          </>
        )}
      </GoogleMap>
    </div>
  );
}
