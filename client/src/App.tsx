import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import io, { Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL
  ? `${import.meta.env.VITE_SOCKET_URL}`
  : undefined;

const socket: Socket = io(BACKEND_URL, {
  autoConnect: true,
});

const CodeShareApp: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const editorRef = useRef<any>(null);

  // Получаем roomId из query-параметра
  const roomId = searchParams.get('room');

  // Если roomId нет — создаём новый и обновляем URL
  useEffect(() => {
    if (!roomId) {
      const newRoomId = Math.random().toString(36).substring(2, 10);
      setSearchParams({ room: newRoomId }, { replace: true });
      return;
    }

    // Подключаемся к комнате
    socket.emit('joinRoom', roomId);

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
  }, [roomId, setSearchParams]);

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !roomId || !initialized) return;
    setCode(value);
    socket.emit('codeChange', { roomId, code: value });
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      // Можно добавить уведомление через Ant Design, если используете
      alert('Ссылка скопирована!');
    });
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          CodeShare — Room: <code>{roomId || '...'}</code>
        </h2>
        {roomId && (
          <button
            onClick={handleCopyLink}
            style={{
              background: '#3a3a3a',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            Copy Link
          </button>
        )}
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

export default CodeShareApp;