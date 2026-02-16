import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAgent } from 'agents/react';
import type { SprintPlanningAgent } from '../../../src/agent';
import type { RoomState, TaskInput, Constraints } from '../../../src/types';

function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const [userName, setUserName] = useState<string | null>(
        localStorage.getItem('userName')
    );
    const [nameInput, setNameInput] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Task form state
    const [taskTitle, setTaskTitle] = useState('');
    const [taskEffort, setTaskEffort] = useState(3);
    const [taskImpact, setTaskImpact] = useState(3);
    const [taskTags, setTaskTags] = useState('');
    const [taskNotes, setTaskNotes] = useState('');

    // Connect to the Agent using useAgent hook
    const agent = useAgent<SprintPlanningAgent, RoomState>({
        agent: 'sprint-planning-agent',
        name: roomId || 'default',
        host: 'localhost:8787',  // Point directly to backend
    });

    // Auto-join if we have a saved userName
    useEffect(() => {
        if (userName && agent.stub) {
            agent.stub.join({ name: userName }).catch(console.error);
        }
    }, [userName, agent.stub]);

    const handleJoin = async () => {
        if (!nameInput.trim()) {
            alert('Please enter your name');
            return;
        }

        try {
            await agent.stub.join({ name: nameInput.trim() });
            setUserName(nameInput.trim());
            localStorage.setItem('userName', nameInput.trim());
        } catch (error) {
            alert('Failed to join: ' + (error as Error).message);
        }
    };

    const handleAddTask = async () => {
        if (!taskTitle.trim()) {
            alert('Task title is required');
            return;
        }

        const taskInput: TaskInput = {
            title: taskTitle.trim(),
            effort: taskEffort,
            impact: taskImpact,
            tags: taskTags.split(',').map(t => t.trim()).filter(t => t.length > 0),
            notes: taskNotes.trim(),
            createdBy: userName || 'Anonymous',
        };

        try {
            await agent.stub.addTask(taskInput);
            // Reset form
            setTaskTitle('');
            setTaskEffort(3);
            setTaskImpact(3);
            setTaskTags('');
            setTaskNotes('');
            setShowAddTask(false);
        } catch (error) {
            alert('Failed to add task: ' + (error as Error).message);
        }
    };

    const handleVote = async (taskId: string) => {
        try {
            await agent.stub.vote({ taskId });
        } catch (error) {
            alert('Failed to vote: ' + (error as Error).message);
        }
    };

    const handleUpdateConstraints = async () => {
        if (!agent.state) return;

        try {
            await agent.stub.updateConstraints(agent.state.constraints);
            alert('Constraints updated!');
        } catch (error) {
            alert('Failed to update constraints: ' + (error as Error).message);
        }
    };

    const handleGeneratePlan = async () => {
        if (!confirm('Generate a new sprint plan using AI? This may take a few seconds.')) {
            return;
        }

        setIsGenerating(true);
        try {
            await agent.stub.generatePlan();
            alert('Sprint plan generated successfully!');
        } catch (error) {
            alert('Failed to generate plan: ' + (error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFinalize = async () => {
        if (!confirm('Finalize this sprint? This will lock all tasks and constraints. This cannot be undone.')) {
            return;
        }

        try {
            await agent.stub.finalize();
            alert('Sprint finalized! All changes are now locked.');
        } catch (error) {
            alert('Failed to finalize: ' + (error as Error).message);
        }
    };

    const copyRoomLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Room link copied to clipboard!');
    };

    // Show join form if not joined
    if (!userName) {
        return (
            <div style={styles.container}>
                <div style={styles.joinCard}>
                    <h2 style={styles.joinTitle}>Join Room: {roomId}</h2>
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                        placeholder="Enter your name"
                        style={styles.input}
                    />
                    <button onClick={handleJoin} style={styles.button}>
                        Join Room
                    </button>
                </div>
            </div>
        );
    }

    const state = agent.state;
    if (!state) {
        return <div style={styles.loading}>Loading room state...</div>;
    }

    const members = Object.values(state.members);
    const tasks = Object.values(state.tasks);
    const isFinalized = state.workflowState === 'FINALIZED';
    const currentPlan = state.currentPlanVersion !== null
        ? state.planVersions.find(v => v.version === state.currentPlanVersion)
        : null;

    return (
        <div style={styles.roomContainer}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>🚀 Sprint Planning Room</h1>
                <div style={styles.headerInfo}>
                    Room ID: <strong>{roomId}</strong> |
                    <button onClick={copyRoomLink} style={styles.linkButton}>
                        Copy Room Link
                    </button>
                </div>
            </div>

            <div style={styles.content}>
                {/* Status Banner */}
                <div style={styles.statusBanner}>
                    <div>
                        <strong>Workflow Status:</strong>{' '}
                        <span style={{
                            ...styles.badge,
                            ...(state.workflowState === 'DRAFT' && styles.badgeDraft),
                            ...(state.workflowState === 'GENERATED' && styles.badgeGenerated),
                            ...(state.workflowState === 'FINALIZED' && styles.badgeFinalized),
                        }}>
              {state.workflowState}
            </span>
                    </div>
                </div>

                {/* Grid Layout */}
                <div style={styles.grid}>
                    {/* Members Card */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>👥 Team Members ({members.length})</h2>
                        {members.map(m => (
                            <div key={m.name} style={styles.memberItem}>
                                {m.name} <small style={{ color: '#999' }}>
                                (joined {new Date(m.joinedAt).toLocaleTimeString()})
                            </small>
                            </div>
                        ))}
                        <div style={{ color: '#10b981', fontWeight: 600, marginTop: '12px' }}>
                            ✓ You've joined as {userName}
                        </div>
                    </div>

                    {/* Constraints Card */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>⚙️ Sprint Constraints</h2>
                        <label style={styles.label}>Sprint Length (days)</label>
                        <input
                            type="number"
                            value={state.constraints.sprintLengthDays}
                            onChange={(e) => agent.setState({
                                ...state,
                                constraints: { ...state.constraints, sprintLengthDays: parseInt(e.target.value) }
                            })}
                            disabled={isFinalized}
                            min="1"
                            max="30"
                            style={styles.input}
                        />
                        <label style={styles.label}>Capacity (story points)</label>
                        <input
                            type="number"
                            value={state.constraints.capacityPoints}
                            onChange={(e) => agent.setState({
                                ...state,
                                constraints: { ...state.constraints, capacityPoints: parseInt(e.target.value) }
                            })}
                            disabled={isFinalized}
                            min="1"
                            style={styles.input}
                        />
                        <label style={styles.label}>Additional Notes</label>
                        <textarea
                            value={state.constraints.notes || ''}
                            onChange={(e) => agent.setState({
                                ...state,
                                constraints: { ...state.constraints, notes: e.target.value }
                            })}
                            disabled={isFinalized}
                            rows={3}
                            style={styles.textarea}
                        />
                        <button
                            onClick={handleUpdateConstraints}
                            disabled={isFinalized}
                            style={styles.button}
                        >
                            Save Constraints
                        </button>
                    </div>
                </div>

                {/* Tasks Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h2 style={styles.cardTitle}>📋 Tasks ({tasks.length})</h2>
                        <button
                            onClick={() => setShowAddTask(!showAddTask)}
                            disabled={isFinalized}
                            style={styles.buttonSmall}
                        >
                            + Add Task
                        </button>
                    </div>

                    {showAddTask && (
                        <div style={styles.addTaskForm}>
                            <input
                                type="text"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                placeholder="Task title *"
                                style={styles.input}
                            />
                            <div style={styles.formRow}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Effort (1-5)</label>
                                    <select
                                        value={taskEffort}
                                        onChange={(e) => setTaskEffort(parseInt(e.target.value))}
                                        style={styles.select}
                                    >
                                        <option value="1">1 - Trivial</option>
                                        <option value="2">2 - Small</option>
                                        <option value="3">3 - Medium</option>
                                        <option value="4">4 - Large</option>
                                        <option value="5">5 - Extra Large</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Impact (1-5)</label>
                                    <select
                                        value={taskImpact}
                                        onChange={(e) => setTaskImpact(parseInt(e.target.value))}
                                        style={styles.select}
                                    >
                                        <option value="1">1 - Low</option>
                                        <option value="2">2 - Minor</option>
                                        <option value="3">3 - Moderate</option>
                                        <option value="4">4 - High</option>
                                        <option value="5">5 - Critical</option>
                                    </select>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={taskTags}
                                onChange={(e) => setTaskTags(e.target.value)}
                                placeholder="Tags (comma-separated)"
                                style={styles.input}
                            />
                            <textarea
                                value={taskNotes}
                                onChange={(e) => setTaskNotes(e.target.value)}
                                rows={2}
                                placeholder="Additional notes..."
                                style={styles.textarea}
                            />
                            <div style={styles.formRow}>
                                <button onClick={handleAddTask} style={styles.buttonSuccess}>
                                    Add Task
                                </button>
                                <button onClick={() => setShowAddTask(false)} style={styles.buttonSecondary}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {tasks.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                            No tasks yet. Add your first task!
                        </p>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} style={styles.taskItem}>
                                <div style={styles.taskHeader}>
                                    <div style={styles.taskTitle}>{task.title}</div>
                                    <button
                                        onClick={() => handleVote(task.id)}
                                        disabled={isFinalized}
                                        style={styles.voteButton}
                                    >
                                        👍 {task.votes}
                                    </button>
                                </div>
                                {task.notes && (
                                    <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                                        {task.notes}
                                    </div>
                                )}
                                <div style={styles.taskMeta}>
                                    <span>Effort: {task.effort}/5</span>
                                    <span>Impact: {task.impact}/5</span>
                                    <span>Value: {(task.impact / task.effort).toFixed(1)}</span>
                                    {task.tags?.map(tag => (
                                        <span key={tag} style={styles.tag}>{tag}</span>
                                    ))}
                                </div>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                                    Created by {task.createdBy} at {new Date(task.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* AI Plan Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🤖 AI Sprint Plan</h2>
                    <button
                        onClick={handleGeneratePlan}
                        disabled={isFinalized || isGenerating}
                        style={{...styles.button, ...styles.buttonSuccess, width: '100%', marginBottom: '16px'}}
                    >
                        {isGenerating ? '⏳ Generating...' : '✨ Generate Sprint Plan with AI'}
                    </button>

                    {currentPlan ? (
                        <div>
                            <div style={styles.planHeader}>
                                <h3 style={{ color: '#065f46', marginBottom: '8px' }}>
                                    ✅ Plan Version {currentPlan.version}
                                </h3>
                                <p style={{ color: '#064e3b', fontSize: '14px' }}>
                                    Generated {new Date(currentPlan.generatedAt).toLocaleString()}
                                </p>
                            </div>

                            <div style={styles.planSummary}>
                                <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>📊 Summary</h4>
                                <p style={{ color: '#1e3a8a' }}>{currentPlan.plan.summary}</p>
                            </div>

                            <h3 style={{ marginBottom: '12px', color: '#333' }}>📈 Prioritized Backlog</h3>
                            {currentPlan.plan.orderedBacklog.map((item, idx) => (
                                <div key={item.taskId} style={styles.planItem}>
                                    <div style={styles.planItemTitle}>{idx + 1}. {item.title}</div>
                                    <div style={styles.planItemReason}>{item.reason}</div>
                                </div>
                            ))}

                            {currentPlan.plan.excluded.length > 0 && (
                                <>
                                    <h3 style={{ margin: '20px 0 12px', color: '#333' }}>❌ Excluded Tasks</h3>
                                    {currentPlan.plan.excluded.map(item => (
                                        <div key={item.taskId} style={{...styles.planItem, borderLeft: '3px solid #ef4444'}}>
                                            <div style={styles.planItemTitle}>{item.title}</div>
                                            <div style={styles.planItemReason}>{item.reason}</div>
                                        </div>
                                    ))}
                                </>
                            )}

                            <h3 style={{ margin: '20px 0 12px', color: '#333' }}>⚠️ Risks</h3>
                            <ul style={{ paddingLeft: '20px', color: '#666' }}>
                                {currentPlan.plan.risks.map((r, i) => (
                                    <li key={i} style={{ marginBottom: '8px' }}>{r}</li>
                                ))}
                            </ul>

                            <h3 style={{ margin: '20px 0 12px', color: '#333' }}>💡 Assumptions</h3>
                            <ul style={{ paddingLeft: '20px', color: '#666' }}>
                                {currentPlan.plan.assumptions.map((a, i) => (
                                    <li key={i} style={{ marginBottom: '8px' }}>{a}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                            No plan generated yet. Add tasks and click "Generate Sprint Plan".
                        </p>
                    )}
                </div>

                {/* Finalize Button */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                        onClick={handleFinalize}
                        disabled={isFinalized || state.workflowState === 'DRAFT'}
                        style={{...styles.button, ...styles.buttonDanger, padding: '14px 32px', fontSize: '16px'}}
                    >
                        🔒 Finalize Sprint (Lock All Changes)
                    </button>
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
    joinCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    joinTitle: {
        color: '#333',
        marginBottom: '24px',
        textAlign: 'center',
    },
    loading: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#666',
    },
    roomContainer: {
        minHeight: '100vh',
        background: '#f5f7fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontSize: '24px',
        marginBottom: '8px',
    },
    headerInfo: {
        opacity: 0.9,
        fontSize: '14px',
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: 'white',
        textDecoration: 'underline',
        cursor: 'pointer',
        marginLeft: '8px',
        fontSize: '14px',
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
    },
    statusBanner: {
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    badge: {
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 600,
    },
    badgeDraft: {
        background: '#fef3c7',
        color: '#92400e',
    },
    badgeGenerated: {
        background: '#dbeafe',
        color: '#1e40af',
    },
    badgeFinalized: {
        background: '#dcfce7',
        color: '#166534',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px',
    },
    card: {
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    cardTitle: {
        fontSize: '18px',
        marginBottom: '16px',
        color: '#333',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    memberItem: {
        padding: '8px',
        background: '#f8f9fa',
        borderRadius: '4px',
        marginBottom: '8px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        color: '#333',
        fontWeight: 500,
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '2px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '12px',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        border: '2px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '12px',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '2px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px',
        marginBottom: '12px',
        boxSizing: 'border-box',
    },
    button: {
        padding: '10px 20px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    buttonSmall: {
        padding: '6px 12px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    buttonSuccess: {
        background: '#10b981',
    },
    buttonSecondary: {
        background: '#6b7280',
    },
    buttonDanger: {
        background: '#ef4444',
    },
    addTaskForm: {
        background: '#f9fafb',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
    },
    formRow: {
        display: 'flex',
        gap: '12px',
    },
    taskItem: {
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '12px',
        borderLeft: '4px solid #667eea',
    },
    taskHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '8px',
    },
    taskTitle: {
        fontWeight: 600,
        color: '#333',
        flex: 1,
    },
    voteButton: {
        background: '#f3f4f6',
        color: '#374151',
        padding: '4px 12px',
        fontSize: '13px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        marginLeft: '8px',
    },
    taskMeta: {
        display: 'flex',
        gap: '12px',
        fontSize: '14px',
        color: '#666',
        marginTop: '8px',
    },
    tag: {
        background: '#e0e7ff',
        color: '#3730a3',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
    },
    planHeader: {
        background: '#f0fdf4',
        border: '2px solid #10b981',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
    },
    planSummary: {
        background: '#eff6ff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
    },
    planItem: {
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '6px',
        marginBottom: '8px',
        borderLeft: '3px solid #667eea',
    },
    planItemTitle: {
        fontWeight: 600,
        color: '#111',
        marginBottom: '4px',
    },
    planItemReason: {
        color: '#666',
        fontSize: '14px',
    },
};

export default Room;