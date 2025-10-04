import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Polyline,
  OverlayView,
  useJsApiLoader,
  InfoWindow,
  Marker
} from "@react-google-maps/api";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// 3D Scooter Component
function ThreeDScooter({ map, position, prevPosition }) {
  const containerRef = useRef();
  const modelRef = useRef();

  // Initialize Three.js once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(120, 120); // slightly bigger canvas
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    const loader = new GLTFLoader();
    loader.load("/models/scooter.glb", (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      modelRef.current = model;

      const animate = () => {
        requestAnimationFrame(animate);
        model.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      animate();
    });

    return () => {
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rotate scooter to travel direction
  useEffect(() => {
    if (!modelRef.current || !prevPosition || !position) return;

    const angle = Math.atan2(
      position.lng - prevPosition.lng,
      position.lat - prevPosition.lat
    );
    modelRef.current.rotation.y = -angle;
  }, [position, prevPosition]);

useEffect(() => {
  if (!map || !modelRef.current) return;

  const handleZoom = () => {
    const zoom = map.getZoom();
    const scale = zoom / 14;
    modelRef.current.scale.set(scale, scale, scale);
  };

  handleZoom();
  const listener = map.addListener("zoom_changed", handleZoom);

  return () => {
    listener.remove(); // ✅ no ESLint error
  };
}, [map]);


  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_LAYER}>
      <div
        ref={containerRef}
        style={{
          width: 120,
          height: 120,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </OverlayView>
  );
}

// Live Tracker Component
export default function LiveTracker({ vin }) {
  const [points, setPoints] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [map, setMap] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    version: "weekly",
  });

  // Fetch live GPS every 2 seconds
  useEffect(() => {
    if (!vin) return;

    const fetchLiveData = async () => {
      try {
        const res = await fetch(
          `https://ble.nerdherdlab.com/livemaploction.php?vin=${vin}`
        );
        const json = await res.json();

        if (json.status === "success" && json.data?.lat_long) {
          const [latStr, lngStr] = json.data.lat_long.split(",");
          const newPoint = {
            lat: parseFloat(latStr.trim()),
            lng: parseFloat(lngStr.trim()),
          };

          setPoints((prev) => {
            if (
              !prev.length ||
              prev[prev.length - 1].lat !== newPoint.lat ||
              prev[prev.length - 1].lng !== newPoint.lng
            ) {
              return [...prev, newPoint];
            }
            return prev;
          });

          setCurrentPos(newPoint);
        }
      } catch (err) {
        console.error("Live fetch error:", err);
      }
    };

    const interval = setInterval(fetchLiveData, 1000);
    return () => clearInterval(interval);
  }, [vin]);

  // Center map on current position
  useEffect(() => {
    if (map && currentPos) {
      map.panTo(currentPos);
    }
  }, [map, currentPos]);

  if (!isLoaded) return <div>Loading Google Map...</div>;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentPos || { lat: 20.5937, lng: 78.9629 }}
        zoom={5}
        onLoad={(mapInstance) => setMap(mapInstance)}
        options={{
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          disableDefaultUI: true,
        }}
      >
        {/* Path line */}
        {points.length > 1 && (
          <Polyline
            path={points}
            options={{
              strokeColor: "#00BFFF",
              strokeOpacity: 0.8,
              strokeWeight: 4,
            }}
          />
        )}

        {/* 3D Scooter */}
       {currentPos && (
  <>
    <Marker
      position={currentPos}
      onClick={() => setShowInfo(true)}
      title={`Vehicle: ${vin}`}
    />
    {points.length > 1 && (
      <ThreeDScooter
        map={map}
        position={currentPos}
        prevPosition={points[points.length - 2]}
      />
    )}
  </>
)}


        {/* InfoWindow */}
        {currentPos && showInfo && (
          <InfoWindow
            position={currentPos}
            onCloseClick={() => setShowInfo(false)}
          >
            <div>
              <strong>Vehicle VIN:</strong> {vin}
              <br />
              <strong>Lat:</strong> {currentPos.lat.toFixed(5)}
              <br />
              <strong>Lng:</strong> {currentPos.lng.toFixed(5)}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
