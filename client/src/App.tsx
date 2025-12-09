import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000';

const CodeShareApp: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [userCount, setUserCount] = useState(0);

  const roomId = searchParams.get('room');

  useEffect(() => {
    if (!roomId) {
      const newRoomId = Math.random().toString(36).substring(2, 10);
      setSearchParams({ room: newRoomId }, { replace: true });
    }
  }, [roomId, setSearchParams]);

  // Yjs-инстансы
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<any>(null);
  const initialTextAddedRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    if (ydocRef.current) ydocRef.current.destroy();
    if (providerRef.current) providerRef.current.destroy();

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('code');
    const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc, {
      connect: true,
    });

    const awareness = provider.awareness;
    const clientId = awareness.clientID;
    const name = 'User ' + Math.floor(Math.random() * 100);
    const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');

    // Устанавливаем начальное состояние
    awareness.setLocalState({ name, color });

    const updateUserCount = () => {
      const states = Array.from(awareness.getStates().values());
      setUserCount(states.length);
    };

    awareness.on('change', updateUserCount);
    updateUserCount();

    // Добавляем начальный текст при синхронизации
    const addInitialTextIfNeeded = () => {
      if (!initialTextAddedRef.current && ytext.toString() === '') {
        ytext.insert(0, '// Collaborative coding...\nconsole.log("Hello, everyone!");');
        initialTextAddedRef.current = true;
      }
    };

    const onSync = (isSynced: boolean) => {
      if (isSynced) {
        addInitialTextIfNeeded();
      }
    };

    provider.on('sync', onSync);

    // === Отслеживание видимости вкладки ===
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Пользователь ушёл с вкладки → ставим offline
        awareness.setLocalState(null);
      } else {
        // Пользователь вернулся → снова online
        awareness.setLocalState({ name, color });
      }
    };

    // === Отправляем сигнал "ушёл" при закрытии вкладки ===
    const handleBeforeUnload = () => {
      awareness.setLocalState(null);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    ydocRef.current = ydoc;
    providerRef.current = provider;
    awarenessRef.current = awareness;

    return () => {
      // === Отправляем сигнал "ушёл" при размонтировании (обновление тоже сюда попадает) ===
      awareness.setLocalState(null);

      ydoc.destroy();
      provider.destroy();
      awareness.destroy();
      provider.off('sync', onSync);

      // Убираем обработчики
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId]);

  const handleEditorMount = (editor: any) => {
    const ydoc = ydocRef.current;
    const awareness = awarenessRef.current;
    if (!ydoc || !awareness || !roomId) return;

    const ytext = ydoc.getText('code');
    new MonacoBinding(ytext, editor.getModel(), new Set([editor]), awareness);
  };

  const handleCopyLink = () => {
    if (roomId) {
      const url = `${window.location.origin}?room=${roomId}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('🔗 Ссылка скопирована!');
      });
    }
  };

  if (!roomId) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '12px 24px',
          backgroundColor: '#1e1e1e',
          color: '#f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2>
          CodeShare — Room: <code>{roomId}</code>
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleCopyLink}
            style={{
              background: '#3a3a3a',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Copy Link
          </button>
          <span>👥 Online: {userCount}</span>
        </div>
      </header>
      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeShareApp;