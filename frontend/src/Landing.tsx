import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createOrJoinRoom = () => {
    const id = roomId.trim() || generateRoomId();
    navigate(`/room/${id}`);
  };

  const createRandomRoom = () => {
    const id = generateRoomId();
    navigate(`/room/${id}`);
  };

  const generateRoomId = () => {
    return 'room-' + Math.random().toString(36).substr(2, 9);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚀 Sprint Planning Agent</h1>
        <p style={styles.subtitle}>
          AI-powered sprint planning with multi-user collaboration. Create or join a room to start planning your next sprint.
        </p>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Room ID (or leave blank for new room)</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createOrJoinRoom()}
            placeholder="e.g., my-team-sprint-42"
            style={styles.input}
          />
        </div>
        
        <button onClick={createOrJoinRoom} style={styles.button}>
          Create / Join Room
        </button>
        
        <div style={styles.divider}>or</div>
        
        <button onClick={createRandomRoom} style={{...styles.button, ...styles.buttonSecondary}}>
          Quick Start: Create Random Room
        </button>

        <div style={styles.featureList}>
          <h3 style={styles.featureTitle}>Features</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>Multi-user real-time collaboration</li>
            <li style={styles.listItem}>AI-powered sprint plan generation (Llama 3.3)</li>
            <li style={styles.listItem}>Task voting and prioritization</li>
            <li style={styles.listItem}>Workflow states: Draft → Generated → Finalized</li>
            <li style={styles.listItem}>Version history of generated plans</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: '#333',
    marginBottom: '12px',
    fontSize: '32px',
  },
  subtitle: {
    color: '#666',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  buttonSecondary: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  divider: {
    textAlign: 'center',
    margin: '24px 0',
    color: '#999',
  },
  featureList: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '24px',
  },
  featureTitle: {
    color: '#333',
    marginBottom: '12px',
    fontSize: '18px',
  },
  list: {
    listStyle: 'none',
    paddingLeft: 0,
  },
  listItem: {
    color: '#666',
    padding: '6px 0',
    paddingLeft: '24px',
    position: 'relative',
  },
};

export default Landing;
