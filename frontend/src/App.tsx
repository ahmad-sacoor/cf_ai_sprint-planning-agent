import { useState, useEffect } from 'react';

interface Task {
    id: string;
    title: string;
    effort: number;
    impact: number;
    tags: string[];
    notes: string;
    createdBy: string;
}

interface RoomState {
    roomId: string;
    members: string[];
    taskCount: number;
    workflowState: string;
    fullState?: {
        tasks: Record<string, Task>;
        planVersions: any[];
    };
}

function App() {
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [joined, setJoined] = useState(false);
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [loading, setLoading] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskEffort, setTaskEffort] = useState(3);
    const [taskImpact, setTaskImpact] = useState(3);
    const [taskNotes, setTaskNotes] = useState('');

    const BASE_URL = 'http://localhost:8787/agents/sprint-planning-agent';

    async function callAgent(method: string, params: any[] = []) {
        const url = `${BASE_URL}/${roomId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, params }),
        });
        return await response.json();
    }

    async function loadState() {
        if (!roomId) return;
        const url = `${BASE_URL}/${roomId}`;
        const response = await fetch(url);
        const data = await response.json();
        setRoomState(data);
    }

    async function joinRoom() {
        if (!roomId || !userName) {
            alert('Please enter both room ID and your name');
            return;
        }
        try {
            setLoading(true);
            await callAgent('join', [{ name: userName }]);
            setJoined(true);
            await loadState();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function addTask() {
        if (!taskTitle) {
            alert('Please enter a task title');
            return;
        }
        try {
            setLoading(true);
            await callAgent('addTask', [{
                title: taskTitle,
                effort: taskEffort,
                impact: taskImpact,
                tags: [],
                notes: taskNotes,
                createdBy: userName,
            }]);
            setTaskTitle('');
            setTaskEffort(3);
            setTaskImpact(3);
            setTaskNotes('');
            await loadState();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function generatePlan() {
        if (!confirm('Generate AI plan? Takes 10-15 seconds.')) return;
        try {
            setLoading(true);
            await callAgent('generatePlan', []);
            await loadState();
            alert('Plan generated!');
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!joined) return;
        const interval = setInterval(loadState, 5000);
        return () => clearInterval(interval);
    }, [joined, roomId]);

    if (!joined) {
        return (
            <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
                <h1>Sprint Planning</h1>
                <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
                <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your Name" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
                <button onClick={joinRoom} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>Join Room</button>
            </div>
        );
    }

    const tasks = roomState?.fullState?.tasks ? Object.values(roomState.fullState.tasks) : [];
    const plan = roomState?.fullState?.planVersions?.[roomState.fullState.planVersions.length - 1];

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Sprint: {roomState?.roomId}</h1>
            <p>Logged in: {userName} | {roomState?.taskCount} tasks</p>
            <hr />
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', marginBottom: '20px' }}>
                <h2>Add Task</h2>
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <label>Effort: <input type="number" min="1" max="30" value={taskEffort} onChange={e => setTaskEffort(Number(e.target.value))} style={{ width: '60px', padding: '8px' }} /></label>
                    <label>Impact: <input type="number" min="1" max="10" value={taskImpact} onChange={e => setTaskImpact(Number(e.target.value))} style={{ width: '60px', padding: '8px' }} /></label>
                </div>
                <textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="Notes" style={{ width: '100%', padding: '8px', marginBottom: '10px', minHeight: '60px' }} />
                <button onClick={addTask} disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Add Task</button>
            </div>
            <h2>Tasks ({tasks.length})</h2>
            {tasks.map(t => (
                <div key={t.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', backgroundColor: 'white' }}>
                    <h3 style={{ margin: 0 }}>{t.title}</h3>
                    <p style={{ color: '#666' }}>Effort: {t.effort} | Impact: {t.impact} | By: {t.createdBy}</p>
                    {t.notes && <p style={{ fontStyle: 'italic' }}>{t.notes}</p>}
                </div>
            ))}
            <button onClick={generatePlan} disabled={loading || tasks.length === 0} style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#ff6b35', color: 'white', border: 'none', cursor: 'pointer', marginTop: '20px' }}>Generate AI Plan</button>
            {plan && (
                <div style={{ backgroundColor: '#e7f3ff', padding: '20px', marginTop: '20px' }}>
                    <h2>AI Sprint Plan</h2>
                    <h3>Prioritized:</h3>
                    <ol>{plan.plan.orderedBacklog.map((i: any, idx: number) => <li key={idx}><strong>{i.title}</strong><br /><span style={{ fontSize: '14px' }}>{i.reason}</span></li>)}</ol>
                    {plan.plan.excluded?.length > 0 && <><h3>Excluded:</h3><ul>{plan.plan.excluded.map((i: any, idx: number) => <li key={idx}><strong>{i.title}</strong><br />{i.reason}</li>)}</ul></>}
                    {plan.plan.summary && <><h3>Summary:</h3><p>{plan.plan.summary}</p></>}
                </div>
            )}
        </div>
    );
}

export default App;