import { useWebSocket } from './hooks/useWebSocket';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import CommandBar from './components/CommandBar';

export default function App() {
  useWebSocket();

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <MapView />
        </div>
        <CommandBar />
      </div>
    </div>
  );
}
