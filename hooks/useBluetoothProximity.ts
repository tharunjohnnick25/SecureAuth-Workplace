import { useEffect, useState, useRef } from 'react';
import { log } from '@/lib/logger';
import { toast } from 'sonner';

export function useBluetoothProximity(userId: string | null) {
  const [deviceConnected, setDeviceConnected] = useState<boolean>(true);
  const [signalStrength, setSignalStrength] = useState<number>(-50); // dBm (closer to 0 is stronger)
  const connectionTimer = useRef<NodeJS.Timeout | null>(null);

  // In a real implementation, you would use navigator.bluetooth.requestDevice()
  // followed by watchAdvertisements() to constantly monitor RSSI.
  // Since Web Bluetooth requires user interaction to pair, and background scanning
  // is experimental, we will simulate a Bluetooth token connection drop for demo purposes,
  // while laying out the API structure.

  useEffect(() => {
    if (!userId) return;

    const simulateProximityLoss = () => {
      // Simulate random connection drop or walking away after a long time
      // For a demo, you could trigger this via a hidden button or window variable
      const isAway = (window as any).__MOCK_BLUETOOTH_AWAY;
      if (isAway) {
        setSignalStrength(-90);
        setDeviceConnected(false);
        log('warn', 'BluetoothAuth', 'Proximity token signal lost. Device out of range.');
        toast.error('Security Token out of range. Locking workstation...');
        window.dispatchEvent(new CustomEvent('AI_RISK_ALERT', { detail: 'BLOCK' }));
      }
    };

    connectionTimer.current = setInterval(simulateProximityLoss, 10000);

    return () => {
      if (connectionTimer.current) clearInterval(connectionTimer.current);
    };
  }, [userId]);

  return { deviceConnected, signalStrength };
}
