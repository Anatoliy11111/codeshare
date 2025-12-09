import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import io, { Socket } from 'socket.io-client';

// Определяем URL бэкенда:
// - в проде: берём из VITE_BACKEND_URL
// - локально: socket.io сам использует тот же хост (благодаря proxy)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}`
  : undefined; // undefined = текущий origin (для proxy)

const socket: Socket = io(BACKEND_URL, {
  // Только в проде можно указать path, но у нас корень → не нужно
  autoConnect: true,
});

const App: React.FC = () => {
  const { roomId: roomIdParam } = useParams<{ roomId?: string }>();
  const [code, setCode] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const editorRef = useRef<any>(null);
  const navigate = useNavigate();

  // Создаём комнату, если ID не задан
  useEffect(() => {
    if (!roomIdParam) {
      const newRoomId = Math.random().toString(36).substring(2, 10);
      navigate(`/room/${newRoomId}`, { replace: true });
      return;
    }

    socket.emit('joinRoom', roomIdParam);

    const onRoomState = (initialCode: string) => {
      setCode(initialCode);
      setInitialized(true);
    };

    const onCodeUpdate = (newCode: string) => {
      if (editorRef.current?.getValue() !== newCode) {
        setCode(newCode);
      }
    };

    socket.on('roomState', onRoomState);
    socket.on('codeUpdate', onCodeUpdate);

    return () => {
      socket.off('roomState', onRoomState);
      socket.off('codeUpdate', onCodeUpdate);
    };
  }, [roomIdParam, navigate]);

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !roomIdParam || !initialized) return;
    setCode(value);
    socket.emit('codeChange', { roomId: roomIdParam, code: value });
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '12px 24px',
          backgroundColor: '#1e1e1e',
          color: '#f0f0f0',
          textAlign: 'center',
          fontSize: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          CodeShare — Room: <code>{roomIdParam || '...'}</code>
        </h2>
      </header>
      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          language="typescript"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          loading="Loading editor..."
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            fontFamily: 'Consolas, "Courier New", monospace',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default App;