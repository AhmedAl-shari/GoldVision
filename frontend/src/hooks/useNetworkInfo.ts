import { useState, useEffect } from "react";

interface NetworkInfo {
  localIP: string;
  port: number;
  url: string;
  isLoading: boolean;
  error: string | null;
}

export const useNetworkInfo = (): NetworkInfo => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    localIP: "localhost",
    port: 5173,
    url: "http://localhost:5173",
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const detectNetworkInfo = async () => {
      try {
        // Get the current hostname/IP from the browser
        const hostname = window.location.hostname;
        const port = window.location.port || "5173";

        // If we're on localhost, try to get the actual LAN IP
        let localIP = hostname;

        if (hostname === "localhost" || hostname === "127.0.0.1") {
          try {
            // Try to get the actual LAN IP by making a request to a service
            // that will return the client's IP
            const response = await fetch("/api/network-info", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const data = await response.json();
              // Use serverLanIP (the backend's actual LAN IP) for QR code
              // This ensures phone can connect to the correct IP address
              localIP = data.serverLanIP || data.serverIP || data.clientIP || hostname;
              console.log('✅ Got LAN IP from backend:', localIP);
            }
          } catch (error) {
            console.warn(
              "Could not detect LAN IP via API, trying WebRTC:",
              error
            );
            // Fallback: try to detect IP from WebRTC
            try {
              const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
              });

              pc.createDataChannel("");
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  const candidate = event.candidate.candidate;
                  const ipMatch = candidate.match(
                    /([0-9]{1,3}(\.[0-9]{1,3}){3})/
                  );
                  if (
                    ipMatch &&
                    !ipMatch[1].startsWith("127.") &&
                    !ipMatch[1].startsWith("169.254.")
                  ) {
                    localIP = ipMatch[1];
                    pc.close();
                  }
                }
              };

              // Cleanup after 3 seconds
              setTimeout(() => pc.close(), 3000);
            } catch (webrtcError) {
              console.warn("WebRTC IP detection failed:", webrtcError);
              // Final fallback: try to get IP from window.location
              if (
                window.location.hostname !== "localhost" &&
                window.location.hostname !== "127.0.0.1"
              ) {
                localIP = window.location.hostname;
              }
            }
          }
        }

        const url = `http://${localIP}:${port}`;

        console.log("🌐 Network Info Detected:", {
          hostname,
          port,
          localIP,
          url,
          userAgent: navigator.userAgent,
        });

        setNetworkInfo({
          localIP,
          port: parseInt(port),
          url,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Network detection error:", error);
        setNetworkInfo((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to detect network",
        }));
      }
    };

    detectNetworkInfo();
  }, []);

  return networkInfo;
};
